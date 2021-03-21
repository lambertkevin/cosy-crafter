export default class CustomError extends Error {
  // istanbul ignore next
  constructor(message, name = "CustomError", code, details) {
    super(message);
    this.name = name;
    this.code = code;
    this.details = details;
  }
}
