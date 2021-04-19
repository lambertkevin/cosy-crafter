module.exports = {
  settings: {
    // Can be added only if changing to typescript (vetur #1427)
    "vetur.experimental.templateInterpolationService": false,
  },
  projects: [
    {
      root: "./services/back-office-service",
      package: "./package.json",
      tsconfig: "./jsconfig.json",
    },
  ],
};
