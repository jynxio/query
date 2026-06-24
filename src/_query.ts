import { createQuery } from "./_create-query.ts";

type Query = ReturnType<typeof createQuery>;

let inst: Query | undefined = undefined;

const query: Query = (...args) => {
    return (inst ||= createQuery())(...args);
};

export { query };
