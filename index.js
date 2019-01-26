const fs = require('fs');
const path = require('path');
const caller = require('caller');
const glob = require('glob');

module.exports = function (options) {
    const defaultOptions = {
        nodeModulesPath: './node_modules',
        packageJsonPath: './package.json',
        includeDev: false
    };

    options = _extend(defaultOptions, (options || {}));

    const buffer = fs.readFileSync(options.packageJsonPath);
    const packages = JSON.parse(buffer.toString());
    let keys = [];

    const overrides = packages.overrides || {};

    if (!path.isAbsolute(options.nodeModulesPath)) {
        let filePath = caller();
        options.nodeModulesPath = path.join(path.dirname(filePath), options.nodeModulesPath);
    }

    if (!path.isAbsolute(options.packageJsonPath)) {
        let filePath = caller();
        options.packageJsonPath = path.join(path.dirname(filePath), options.packageJsonPath);
    }

    for (let key in packages.dependencies) {
        let override = overrides[key] || {};
        keys = keys.concat(getMainFiles(options.nodeModulesPath + "/" + key, override, options.nodeModulesPath, overrides));
    }

    if (options.includeDev) {
        for (let key in packages.devDependencies) {
            let override = overrides[key] || {};
            keys = keys.concat(getMainFiles(options.nodeModulesPath + "/" + key, override, options.nodeModulesPath, overrides));
        }
    }

    return keys;
};

function _extend(object, source) {
    const obj = {};
    for (let key in object) {
        obj[key] = source[key] || object[key];
    }
    return obj;
}

/**
 * Gets the main files in a NPM package
 * @param  {String} modulePath        Path to package
 * @param  {Object} override          Override object for package
 * @param  {String} nodeModulesPath   Path to all packages
 * @param  {Array}  overrides         Array of override objects for all packages
 * @return {Array}                    Array of main files in package and all dependencies
 */
function getMainFiles(modulePath, override, nodeModulesPath, overrides) {
    const json = JSON.parse(fs.readFileSync(modulePath + '/package.json'));
    let files = [];

    if (override.ignore) {
        return [];
    }

    // Main override as string
    if (typeof override.main == 'string') {
        files = files.concat(glob.sync(path.resolve(modulePath + "/" + override.main)));
        //Main override as array
    } else if (typeof override.main == 'object') {
        override.main.forEach(om => {
            files = files.concat(glob.sync(path.resolve(modulePath + "/" + om)));
        });

        // No main override
    } else if (json.main) {
        files = files.concat(glob.sync(path.resolve(modulePath + "/" + json.main)));
    }

    for (let key in json.dependencies) {
        const childOverride = overrides[key] || {};
        files = files.concat(getMainFiles(nodeModulesPath + "/" + key, childOverride, nodeModulesPath, overrides));
    }

    return files;
}