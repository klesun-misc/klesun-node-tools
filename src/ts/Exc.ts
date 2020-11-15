
// see Rej.js
// this thing is similar - a convenient way to classify exception using http status codes
// I now prefer `throw exc`/`return value` pattern rather than `return Promise.reject(exc)`/`return Promise.resolve(value)`, 
// since it's less verbose, and can be used in a sync context, so here goes exception version of the Rej.js

type ExpectedError = ErrorExtendedData & {
    isOk: true,
    message: string,
    toString: () => string,
}

type UnexpectedError = ErrorExtendedData & Error & {
    isOk: false,
}

type ErrorExtendedData = {
    httpStatusCode: number,
    /**
     * whether this error is ok to be ignored and not be reported
     * intended for expected user errors, like wrong password, limit exceeded, etc...
     */
    isOk: boolean,
    /** error-specific data in free form format */
    data: unknown,
}

type StatusError = ExpectedError | UnexpectedError;

let toMakeExc = (httpStatusCode: number, okByDefault = false): ExcCls => {
    const makeExc: ExcCls = (msg: string, data = undefined) => {
        let exc: StatusError, isOk;
        ({isOk, ...data} = (data || {}));
        if (isOk === undefined) {
            isOk = okByDefault;
        }
        let untypedExc: Error | ExpectedError;
        if (!isOk) {
            exc = <StatusError>new Error(msg);
        } else {
            // this is probably faster, and saves you few days of life
            // when you see tons of meaningless stack traces in the log
            exc = <StatusError>{message: msg, toString: () => msg, isOk: true};
        }
        exc.httpStatusCode = httpStatusCode;
        exc.isOk = isOk;
        exc.data = data;
        return exc;
    };
    makeExc.httpStatusCode = httpStatusCode;
    makeExc.matches = (otherCode) => otherCode == httpStatusCode;
    return makeExc;
};

let isOk = true;

type ExcData = {
    isOk?: boolean,
    passToClient?: boolean,
    [k: string]: unknown,
};

type ExcCls = {
    httpStatusCode: number,
    matches: (otherCode: number) => boolean,
} & (
    (msg: string, data?: ExcData) => StatusError
);

let classes = {
    // non-error responses
    NoContent: toMakeExc(204, isOk),
    ResetContent: toMakeExc(205, isOk),
    PartialContent: toMakeExc(206, isOk),

    // user errors
    BadRequest: toMakeExc(400),
    NotAuthorized: toMakeExc(401),
    Forbidden: toMakeExc(403, isOk),
    NotFound: toMakeExc(404),
    MethodNotAllowed: toMakeExc(405),
    NotAcceptable: toMakeExc(406),
    ProxyAuthenticationRequired: toMakeExc(407),
    RequestTimeout: toMakeExc(408),
    Conflict: toMakeExc(409),
    Gone: toMakeExc(410),
    // unable to process the requested instructions, I'll use it
    // as cannot satisfy in RBS - when GDS returns error and such
    UnprocessableEntity: toMakeExc(422),
    Locked: toMakeExc(423),
    FailedDependency: toMakeExc(424),
    TooEarly: toMakeExc(425),
    TooManyRequests: toMakeExc(429),
    LoginTimeOut: toMakeExc(440),

    // server errors
    InternalServerError: toMakeExc(500),
    NotImplemented: toMakeExc(501),
    BadGateway: toMakeExc(502),
    ServiceUnavailable: toMakeExc(503),
    GatewayTimeout: toMakeExc(504),
    InsufficientStorage: toMakeExc(507),
    NotExtended: toMakeExc(510),
};

const typedClasses: Record<keyof typeof classes, ExcCls> = classes;

const Exc = {
    ...typedClasses,
    dict: classes,
    list: Object.values(classes),
};

export default Exc;
