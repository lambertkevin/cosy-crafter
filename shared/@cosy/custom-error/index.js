/* istanbul ignore file */
export default class CustomError extends Error {
  constructor(message, name = "CustomError", code, details) {
    super(message);
    this.name = name;
    this.code = code;
    this.details = details;
  }
}
