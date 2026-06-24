type Timer = Readonly<Record<"start" | "abort", () => void>>;

function createTimer(task: () => void, delay: number): Timer {
    const MIN_DELAY = 0;
    const MAX_DELAY = 2_147_483_647;

    if (delay <= MIN_DELAY) throw new RangeError(`"delay" must be >= ${MIN_DELAY}`);
    if (delay >= MAX_DELAY) throw new RangeError(`"delay" must be <= ${MAX_DELAY}`);

    const isLongWaitTask = delay > 10;
    const create = isLongWaitTask ? createTimerByTimeout : createTimerBySignal;

    return create(task, delay);
}

function createTimerByTimeout(task: () => void, delay: number): Timer {
    let startCount = 0;
    let ref: undefined | NodeJS.Timeout = undefined;

    return { start, abort };

    function start(): void {
        if (startCount++ > 0) return;

        ref = setTimeout(task, delay);
    }

    function abort(): void {
        clearTimeout(ref);
    }
}

function createTimerBySignal(task: () => void, delay: number): Timer {
    let startCount = 0;
    let ref: undefined | AbortSignal;

    return { start, abort };

    function start(): void {
        if (startCount++ > 0) return;

        ref = AbortSignal.timeout(delay);
        ref.addEventListener("abort", task);
    }

    function abort(): void {
        ref?.removeEventListener("abort", task);
    }
}

export { createTimer };
