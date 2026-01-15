/**
 * Jest config for messaging + scheduler modules coverage
 */
module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: 'src',
    testRegex: '.*(messaging|scheduler).*\\.spec\\.ts$',
    transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
    },
    collectCoverageFrom: [
        'modules/messaging/**/*.ts',
        'modules/scheduler/**/*.ts',
        '!**/*.spec.ts',
        '!**/*.module.ts',
    ],
    coverageDirectory: '../coverage',
    testEnvironment: 'node',
};
