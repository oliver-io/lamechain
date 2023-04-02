export type PrimitiveSingle = string | number | boolean | undefined | null;
export type PrimitiveValue = PrimitiveSingle | Array<PrimitiveSingle>;
export type PrimitiveRecord = Record<string, PrimitiveValue>;

export type LoggerContext = {
    logger: Logger,
    debug?: boolean
};

export interface Logger {
    info: (...args:any) => void;
    error: (...args:any) => void;
    warn: (...args:any) => void;
    debug: (...args:any) => void;
    trace: (...args:any) => void;
    child?: (args:any) => Logger;
    group?: (args:any) => void;
}