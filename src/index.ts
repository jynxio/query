import { QueryCtor } from "./_ctor.ts";
import { queryInst } from "./_inst.ts";
import * as QueryType from "./_types.ts";
import { QueryErr } from "./_error.ts";

type Query = {
    Options: QueryType.QueryOpts;

    Response: QueryType.QueryRes;
    Error: QueryType.QueryErr;

    Constructor: QueryType.QueryCtor;
    Instance: QueryType.QueryInst;
};

const Query = QueryCtor;
const query = queryInst;

export default query;
export { Query, query };
