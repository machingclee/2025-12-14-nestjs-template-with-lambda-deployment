# On Nestjs

## Basic structure

## How to add new module

```bash
nest generate module modules/file-generation
```

then add a controller:

```bash
# nest generate controller <controller-name> <module>/controllers --flat --dry-run
nest generate controller export-template modules/file-generation/controllers --flat --dry-run
```

then add a service:

```bash
# nest generate controller <service-name> <module>/services --flat --dry-run
nest generate service export-tempalte-app modules/file-generation/appliaction-service --flat --dry-run
```

then add a service:

```bash
# nest generate controller <service-name> <module>/services --flat --dry-run
nest generate service export-tempalte-app modules/file-generation/services --flat --dry-run
```


## Generate Entity Classes

Example:

```bash
yarn gen:entity UserExportReportRecord Export_Template Export_Template_Format
```

## Dependency Injection

- In nestjs all "beans" are called **_providers_**, `@Bean` = `@Injectable` in nestjs

- All providers need to be registered in **_.module_** file for dependency injection into other controllers/providers **_within the same module_**

- We need to export and import the providers for sharing between different modules

- When there are "mutual" dependencies among two modules, you need to google/chat-gpt for `forwardRef` function on how to achieve it.

- For DTO:

    - For validation of request dto, see `yarn add class-validator`
    - To convert a field in DTO into a specific type, `yarn add class-transformer`

    Example:

    ```ts
    import { IsInt, IsOptional } from "class-validator"
    import { Type } from "class-transformer

    export class GetUsersParamDto {
      @IsOptional()
      @IsInt()
      @Type(() => Numbner)
      id?: number
    }
    ```

## Swagger documentation

- Each controller can be annotated by `@ApiTags` for the display name in swagger doc.

- Continued from `GetUsersParamDto` above, we have annotation `@ApiPropertyOptional({ description: "...", example: "..." })` and `@ApiProperty(...)` to provide additional information.

- Use `@ApiOperation` to describe what the API does

## How to add Repository into a Service

First write down the dependency:

```ts
class SomeClass{
    constructor(
      @InjectRepository(User)
      private readonly
        userRepository: Repository<User>,
    ) {}
}
```

next at the module level where this `SomeClass` lives, add:

```ts
imports: [TypeOrmModule.forFeature([User])],
```

and at the root app module level make sure the metadata (the entities class definition) is imported

```ts
// app.module.ts

useFactory: (configService: ConfigService) => {
  return {
    type: 'postgres',
    ...
    entities: [User, Company],
  };
},
```

## Shortcut for nest-cli

```bash
# create module
nest g mo <path> --flat --dry-run

# create controller
nest g co <path> --flat --dry-run

# providers/services
nest g s <path> --flat --dry-run?
```

`--dry-run` is **_optional_**, which simply shows the list of paths of files to be generated for confirmation.
