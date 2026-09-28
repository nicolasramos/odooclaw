"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.setLogger = void 0;
// oxlint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => { };
const createNoopLogger = () => {
    return {
        child: () => {
            return createNoopLogger();
        },
        debug: noop,
        error: noop,
        info: noop,
        trace: noop,
        warn: noop,
    };
};
let currentLogger = createNoopLogger();
const setLogger = (newLogger) => {
    currentLogger = newLogger;
};
exports.setLogger = setLogger;
const createDelegatingLogger = (getContext) => {
    const getLogger = () => {
        let targetLogger = currentLogger;
        for (const [key, value] of Object.entries(getContext())) {
            targetLogger = targetLogger.child({ [key]: value });
        }
        return targetLogger;
    };
    return {
        child: (context) => {
            return createDelegatingLogger(() => {
                return { ...getContext(), ...context };
            });
        },
        debug: (context, message) => {
            getLogger().debug(context, message);
        },
        error: (context, message) => {
            getLogger().error(context, message);
        },
        info: (context, message) => {
            getLogger().info(context, message);
        },
        trace: (context, message) => {
            getLogger().trace(context, message);
        },
        warn: (context, message) => {
            getLogger().warn(context, message);
        },
    };
};
exports.logger = createDelegatingLogger(() => {
    return { package: 'global-agent' };
});
