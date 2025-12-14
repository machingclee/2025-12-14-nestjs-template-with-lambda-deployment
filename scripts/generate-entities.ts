import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

// Database connection configuration
const dbConfig = {
    host: process.env.POSTGRES_HOST,
    port: 5432,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DATABASE,
    ssl: {
        rejectUnauthorized: false,
    },
};

// Output directory for entities
const outputDir = path.resolve(process.cwd(), 'reverse-engineered');

// Parse command line arguments to get specific tables
function parseCommandLineArgs() {
    const args = process.argv.slice(2);
    const tables: string[] = [];

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '--table' || arg === '-t') {
            // Get the table name
            if (i + 1 < args.length) {
                tables.push(args[i + 1]);
                i++; // Skip the next argument as we've processed it
            }
        } else if (arg.startsWith('--table=')) {
            // Handle --table=name format
            const tableName = arg.split('=')[1];
            if (tableName) {
                tables.push(tableName);
            }
        } else if (!arg.startsWith('--')) {
            // Assume it's a table name if it doesn't start with --
            tables.push(arg);
        }
    }

    return { tables };
}

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Create database client
const client = new Client(dbConfig);

async function generateEntities(specificTables: string[] = []) {
    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('Connected to database.');

        let tables;

        if (specificTables.length > 0) {
            // Filter for specific tables
            console.log(
                `Generating entities for specific tables: ${specificTables.join(', ')}`,
            );

            // Create a parameterized query for safety
            const placeholders = specificTables.map((_, i) => `$${i + 1}`).join(',');
            const tablesResult = await client.query(
                `
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_type = 'BASE TABLE'
              AND table_name IN (${placeholders})
        `,
                specificTables,
            );

            tables = tablesResult.rows;

            // Check if all requested tables were found
            const foundTables = tables.map(t => t.table_name);
            const missingTables = specificTables.filter(t => !foundTables.includes(t));

            if (missingTables.length > 0) {
                console.warn(
                    `Warning: The following tables were not found: ${missingTables.join(', ')}`,
                );
            }
        } else {
            // Get all tables except migrations
            const tablesResult = await client.query(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            AND table_name NOT IN ('migrations', 'typeorm_metadata')
      `);

            tables = tablesResult.rows;
        }

        console.log(`Found ${tables.length} tables to process.`);

        // Process each table
        const promises: Promise<any>[] = [];
        for (const table of tables) {
            promises.push(generateEntity(table));
        }
        await Promise.all(promises);

        console.log('Entity generation completed successfully!');
    } catch (error) {
        console.error('Error generating entities:', error);
        process.exit(1);
    } finally {
        // Close the database connection
        await client.end();
        console.log('Database connection closed.');
    }

    async function generateEntity(table: any) {
        const tableName = table.table_name;
        console.log(`Processing table: ${tableName}`);

        // Get columns for the table
        const columnsResult = await client.query(
            `
          SELECT
              column_name,
              data_type,
              character_maximum_length,
              is_nullable,
              column_default,
              udt_name
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position
      `,
            [tableName],
        );

        // Get primary key information
        const primaryKeysResult = await client.query(
            `
          SELECT kcu.column_name
          FROM information_schema.table_constraints tc
                   JOIN information_schema.key_column_usage kcu
                        ON tc.constraint_name = kcu.constraint_name
                            AND tc.table_schema = kcu.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_schema = 'public'
            AND tc.table_name = $1
      `,
            [tableName],
        );

        // Get foreign key information
        const foreignKeysResult = await client.query(
            `
          SELECT
              kcu.column_name,
              ccu.table_name AS foreign_table_name,
              ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints AS tc
                   JOIN information_schema.key_column_usage AS kcu
                        ON tc.constraint_name = kcu.constraint_name
                            AND tc.table_schema = kcu.table_schema
                   JOIN information_schema.constraint_column_usage AS ccu
                        ON ccu.constraint_name = tc.constraint_name
                            AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
            AND tc.table_name = $1
      `,
            [tableName],
        );

        // Get enum types for columns
        const enumsResult = await client.query(
            `
          SELECT
              cols.column_name,
              pg_enum.enumlabel
          FROM pg_type
                   JOIN pg_enum ON pg_enum.enumtypid = pg_type.oid
                   JOIN pg_catalog.pg_namespace n ON n.oid = pg_type.typnamespace
                   JOIN information_schema.columns cols ON cols.udt_name = pg_type.typname
          WHERE cols.table_name = $1
          ORDER BY cols.column_name, pg_enum.enumsortorder
      `,
            [tableName],
        );

        // Group enum values by column
        const enumColumns = {};
        for (const row of enumsResult.rows) {
            if (!enumColumns[row.column_name]) {
                enumColumns[row.column_name] = [];
            }
            enumColumns[row.column_name].push(row.enumlabel);
        }

        const primaryKeys = primaryKeysResult.rows.map(row => row.column_name);
        const foreignKeys = foreignKeysResult.rows;

        const className = toPascalCase(tableName);

        // Generate entity file content
        let entityContent = `// Generated on ${new Date().toISOString()} by entity generator
import { Entity, PrimaryGeneratedColumn, PrimaryColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
`;

        // Add import statements for related entities
        const relatedEntities = new Set();
        foreignKeys.forEach(fk => {
            relatedEntities.add(toPascalCase(fk.foreign_table_name));
        });

        relatedEntities.forEach(entity => {
            entityContent += `import { ${entity} } from './${entity}.entity';\n`;
        });

        entityContent += `
@Entity('${tableName}')
export class ${className} {
`;

        // Add columns
        for (const column of columnsResult.rows) {
            const columnName = column.column_name;
            const isPrimary = primaryKeys.includes(columnName);
            const isEnum = columnName in enumColumns;
            const isForeignKey = foreignKeys.find(fk => fk.column_name === columnName);

            // Skip foreign key columns as they'll be handled by relations
            if (isForeignKey) continue;

            if (isPrimary) {
                // Handle primary key column
                if (column.data_type === 'uuid') {
                    entityContent += `  @PrimaryGeneratedColumn('uuid', { name: '${columnName}' })\n`;
                    entityContent += `  ${columnName}: string;\n\n`;
                } else if (
                    column.column_default &&
                    column.column_default.includes('nextval')
                ) {
                    entityContent += `  @PrimaryGeneratedColumn({ name: '${columnName}' })\n`;
                    entityContent += `  ${columnName}: number;\n\n`;
                } else {
                    entityContent += `  @PrimaryColumn({ name: '${columnName}' })\n`;
                    entityContent += `  ${columnName}: ${mapPostgresTypeToTypeScript(column.data_type, column.udt_name)};\n\n`;
                }
            } else if (isEnum) {
                // Handle enum column
                const enumValues = enumColumns[columnName];
                const enumValuesString = enumValues.map(v => `"${v}"`).join(', ');
                const isNullable = column.is_nullable === 'YES';

                entityContent += `  @Column('enum', { name: '${columnName}', enum: [${enumValuesString}]${isNullable ? ', nullable: true' : ''} })\n`;
                entityContent += `  ${columnName}: ${enumValues.map(v => `"${v}"`).join(' | ')}${isNullable ? ' | null' : ''};\n\n`;
            } else {
                // Handle regular column
                const typeormType = mapPostgresTypeToTypeORM(
                    column.data_type,
                    column.udt_name,
                );
                const tsType = mapPostgresTypeToTypeScript(
                    column.data_type,
                    column.udt_name,
                );
                const isNullable = column.is_nullable === 'YES';

                const options: string[] = [];
                options.push(`name: '${columnName}'`);
                if (isNullable) options.push('nullable: true');
                if (column.character_maximum_length)
                    options.push(`length: ${column.character_maximum_length}`);
                if (column.column_default && !column.column_default.includes('nextval')) {
                    let defaultValue = column.column_default;
                    if (defaultValue.startsWith("'") && defaultValue.endsWith("'")) {
                        // It's a string default
                        options.push(`default: ${defaultValue}`);
                    } else if (!isNaN(Number(defaultValue))) {
                        // It's a number default
                        options.push(`default: ${defaultValue}`);
                    } else if (defaultValue === 'true' || defaultValue === 'false') {
                        // It's a boolean default
                        options.push(`default: ${defaultValue}`);
                    } else if (defaultValue.includes('::')) {
                        // It's a typed default, just use string representation
                        options.push(`default: () => "${defaultValue}"`);
                    } else {
                        // It's some other default, possibly a function call
                        options.push(`default: () => "${defaultValue}"`);
                    }
                }

                const optionsStr =
                    options.length > 0 ? `, { ${options.join(', ')} }` : '';

                entityContent += `  @Column('${typeormType}'${optionsStr})\n`;
                entityContent += `  ${columnName}: ${tsType}${isNullable ? ' | null' : ''};\n\n`;
            }
        }

        // Add relations
        for (const fk of foreignKeys) {
            const relatedClassName = toPascalCase(fk.foreign_table_name);
            const propertyName = fk.column_name.replace('_id', ''); // Create a property name by removing _id suffix

            entityContent += `  @ManyToOne(() => ${relatedClassName})\n`;
            entityContent += `  @JoinColumn({ name: '${fk.column_name}' })\n`;
            entityContent += `  ${propertyName}: ${relatedClassName};\n\n`;
        }

        entityContent += `}\n`;

        // Write to file
        const filePath = path.join(outputDir, `${className}.entity.ts`);
        fs.writeFileSync(filePath, entityContent);
        console.log(`Created entity file: ${filePath}`);
    }
}

// Helper functions
function toPascalCase(str) {
    return str
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
}

function mapPostgresTypeToTypeORM(pgType, udtName) {
    const mapping = {
        integer: 'int',
        bigint: 'bigint',
        'character varying': 'varchar',
        text: 'text',
        boolean: 'boolean',
        'timestamp with time zone': 'timestamp with time zone',
        'timestamp without time zone': 'timestamp',
        date: 'date',
        numeric: 'decimal',
        jsonb: 'jsonb',
        json: 'json',
        uuid: 'uuid',
        'USER-DEFINED': 'enum',
    };

    return mapping[pgType] || pgType;
}

function mapPostgresTypeToTypeScript(pgType, udtName) {
    const mapping = {
        integer: 'number',
        bigint: 'string',
        'character varying': 'string',
        text: 'string',
        boolean: 'boolean',
        'timestamp with time zone': 'Date',
        'timestamp without time zone': 'Date',
        date: 'Date',
        numeric: 'number',
        'double precision': 'number',
        jsonb: 'string',
        json: 'string',
        uuid: 'string',
        'USER-DEFINED': 'string', // Enums are typically strings
    };

    return mapping[pgType] || 'any';
}

// Parse command line arguments
const { tables } = parseCommandLineArgs();

// Run the function with specified tables (if any)
generateEntities(tables).catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
});
