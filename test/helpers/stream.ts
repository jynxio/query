function createTextStream(
    text: string,
    opts: {
        onCancel?: () => void;
        stayOpen?: boolean;
    } = {},
): ReadableStream<Uint8Array> {
    return new ReadableStream<Uint8Array>({
        start(controller) {
            controller.enqueue(new TextEncoder().encode(text));
            if (!opts.stayOpen) controller.close();
        },
        cancel() {
            opts.onCancel?.();
        },
    });
}

export { createTextStream };
