function createTextStream(
    text: string,
    options: {
        onCancel?: () => void;
        stayOpen?: boolean;
    } = {},
): ReadableStream<Uint8Array> {
    return new ReadableStream<Uint8Array>({
        start(controller) {
            controller.enqueue(new TextEncoder().encode(text));
            if (!options.stayOpen) controller.close();
        },
        cancel() {
            options.onCancel?.();
        },
    });
}

export { createTextStream };
