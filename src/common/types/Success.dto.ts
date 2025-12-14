export class SuccessDto<T> {
    success = true;
    result: T;

    constructor(result: T) {
        this.result = result;
    }
}
