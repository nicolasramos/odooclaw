export type LogMethod = (context: object | string, message?: string) => void;
export type Logger = {
    child: (context: object) => Logger;
    debug: LogMethod;
    error: LogMethod;
    info: LogMethod;
    trace: LogMethod;
    warn: LogMethod;
};
export declare const setLogger: (newLogger: Logger) => void;
export declare const logger: Logger;
