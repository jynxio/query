type JSONData = null | boolean | number | string | JSONData[] | { [key: string]: JSONData };

function toJSONData(jsonText: string): JSONData {
    return JSON.parse(jsonText);
}

export { toJSONData };
export type { JSONData };
