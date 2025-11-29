/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * SchemaEncoder for Aptos (Move + BCS) using @aptos-labs/ts-sdk Serializer/Deserializer
 *
 * Supports: bool, address (32-byte hex), u8/u16/u32/u64/u128, bytes32 (fixed 32 bytes),
 * string, tuple(...), and arrays (type[]).
 *
 * Returns encoded bytes as Uint8Array. Use bytesToHex() if you want hex strings.
 *
 * NOTE: small import adjustments may be required depending on exact SDK version.
 */

import {
  Serializer,
  Deserializer
  // If your SDK exports them under a BCS namespace, you might need:
  // import { BCS } from "@aptos-labs/ts-sdk"; const { Serializer, Deserializer } = BCS;
} from "@aptos-labs/ts-sdk";

/* ---- types used by the encoder ---- */

export type SchemaValue =
  | string
  | boolean
  | number
  | bigint
  | Uint8Array
  | Record<string, unknown>
  | Record<string, unknown>[]
  | unknown[];

export interface SchemaItem {
  name: string;
  type: string; // e.g. "address", "u64", "(u64,address)[]", "tuple(u64 score,address reviewer)[]"
  value: SchemaValue;
}

export interface SchemaItemWithSignature extends SchemaItem {
  signature: string;
}

export interface SchemaDecodedItem {
  name: string;
  type: string;
  signature: string;
  value: SchemaItem | SchemaItem[] | SchemaItem[][];
}

/* ---- helpers: hex <-> bytes, string utils, type detection ---- */

function stripWhitespace(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.indexOf("0x") === 0 ? hex.slice(2) : hex;
  if (normalized.length % 2 !== 0) throw new Error("Invalid hex length");
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(normalized.substr(i * 2, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "0x";
  for (let i = 0; i < bytes.length; i++) {
    const hexByte = bytes[i].toString(16);
    hex += (hexByte.length === 1 ? "0" : "") + hexByte;
  }
  return hex;
}

function isHexString(s: string) {
  const normalized = s.indexOf("0x") === 0 ? s.slice(2) : s;
  return /^[0-9a-fA-F]*$/.test(normalized);
}

const TUPLE_TYPE = "tuple";
const BYTES32 = "bytes32";
const ADDRESS = "address";
const BOOL = "bool";

/* ---- Schema parser (simple) ----
   Input format similar to the EVM example:
   "address user, bool approved, tuple(u64 score, address reviewer)[] reviews"
*/
function parseSchema(schema: string): SchemaItemWithSignature[] {
  // split top-level comma-separated params (doesn't split inside parentheses)
  const items: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < schema.length; i++) {
    const ch = schema[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      items.push(schema.slice(start, i));
      start = i + 1;
    }
  }
  if (start < schema.length) items.push(schema.slice(start));

  const parsed: SchemaItemWithSignature[] = items
    .map((it) => stripWhitespace(it))
    .filter(Boolean)
    .map((it) => {
      // each item is like: "<type> <name>" or just "<type>"
      // we need to capture arrays [] and tuple(...) forms
      // keep the original type string as declared (including [] suffix)
      const parts = it.trim().split(/\s+/);
      // last token considered as name if more than 1 token
      let name = "";
      let rawType = parts[0];
      if (parts.length >= 2) {
        // type might contain spaces if tuple signature used with names (but we use a simple parser)
        // attempt to reconstruct the type (all but last token)
        name = parts.slice(-1)[0];
        rawType = parts.slice(0, -1).join(" ");
      } else {
        // only one token: could be 'tuple(u64 a, address b)[]' or 'u64'
        // no name provided; we set name to empty string
        name = "";
      }

      rawType = rawType.trim();

      // signature is exactly the raw type + (space + name if supplied)
      const signature = name ? `${rawType} ${name}` : rawType;

      // default value: arrays -> [], tuple -> [] or {}
      const isArray = rawType.slice(-2) === "[]";
      // For internal storage keep the full rawType (with [] if present)
      let defaultValue: SchemaValue;
      if (isArray) defaultValue = [];
      else if (rawType.indexOf(`${TUPLE_TYPE}(`) === 0) defaultValue = [];
      else {
        // primitive default
        const prim = rawType.replace(/\s/g, "");
        defaultValue = getDefaultValueForTypeName(prim);
      }

      return {
        name,
        type: rawType,
        signature,
        value: defaultValue
      } as SchemaItemWithSignature;
    });

  return parsed;
}

/* ---- default values ---- */

function getDefaultValueForTypeName(typeName: string): SchemaValue {
  const t = typeName.trim();
  if (t === BOOL) return false;
  if (t.indexOf("u") === 0 && /^[u]\d+$/i.test(t)) return BigInt(0);
  if (t === ADDRESS) return "0x" + new Array(33).join("0"); // 32 zeros + "0x"
  if (t === BYTES32) return new Uint8Array(32);
  return "";
}

/* ---- encoding helpers using Serializer ---- */

function serializePrimitive(serializer: Serializer, typeName: string, value: SchemaValue) {
  const t = typeName.trim();
  if (t === BOOL) {
    serializer.serializeBool(Boolean(value));
    return;
  }

  if (t === "string") {
    serializer.serializeStr(String(value ?? ""));
    return;
  }

  if (t === BYTES32) {
    if (typeof value === "string") {
      // treat as hex or raw string -> convert to bytes and zero-pad/trim
      let bytes: Uint8Array;
      if (isHexString(value)) bytes = hexToBytes(String(value));
      else bytes = new TextEncoder().encode(String(value));
      if (bytes.length > 32) throw new Error("bytes32 value too long");
      const fixed = new Uint8Array(32);
      fixed.set(bytes, 0);
      serializer.serializeFixedBytes(fixed);
    } else if (value instanceof Uint8Array) {
      if (value.length !== 32) {
        throw new Error("bytes32 must be exactly 32 bytes");
      }
      serializer.serializeFixedBytes(value);
    } else {
      throw new Error("Unsupported bytes32 value");
    }
    return;
  }

  if (t === ADDRESS) {
    // expect 32-byte hex string. Accept "0x..." or raw 64 hex chars
    if (typeof value !== "string") throw new Error("address must be hex string");
    const bytes = hexToBytes(value);
    if (bytes.length !== 32) {
      // If shorter, left-pad with zeros (but Aptos address is 32 bytes)
      if (bytes.length < 32) {
        const fixed = new Uint8Array(32);
        fixed.set(bytes, 32 - bytes.length);
        serializer.serializeFixedBytes(fixed);
      } else {
        throw new Error("address must be 32 bytes");
      }
    } else {
      serializer.serializeFixedBytes(bytes);
    }
    return;
  }

  // unsigned ints: u8 u16 u32 u64 u128
  const uMatch = /^u(\d+)$/i.exec(t);
  if (uMatch) {
    const bits = Number(uMatch[1]);
    const num = value === undefined || value === null ? 0n : BigInt(value as any);
    if (bits === 8) serializer.serializeU8(Number(num));
    else if (bits === 16) serializer.serializeU16(Number(num));
    else if (bits === 32) serializer.serializeU32(Number(num));
    else if (bits === 64) serializer.serializeU64(num);
    else if (bits === 128) serializer.serializeU128(num);
    else {
      throw new Error(`Unsupported unsigned integer size u${bits}`);
    }
    return;
  }

  throw new Error(`Unsupported primitive type: ${typeName}`);
}

/* ---- decode helpers using Deserializer ---- */

function deserializePrimitive(deser: Deserializer, typeName: string): SchemaValue {
  const t = typeName.trim();
  if (t === BOOL) return deser.deserializeBool();
  if (t === "string") return deser.deserializeStr();
  if (t === BYTES32) {
    // read fixed 32 bytes
    const bytes = deser.deserializeFixedBytes(32);
    return bytes;
  }
  if (t === ADDRESS) {
    const bytes = deser.deserializeFixedBytes(32);
    return bytesToHex(bytes);
  }
  const uMatch = /^u(\d+)$/i.exec(t);
  if (uMatch) {
    const bits = Number(uMatch[1]);
    if (bits === 8) return deser.deserializeU8();
    if (bits === 16) return deser.deserializeU16();
    if (bits === 32) return deser.deserializeU32();
    if (bits === 64) return deser.deserializeU64();
    if (bits === 128) return deser.deserializeU128();
    throw new Error(`Unsupported unsigned integer size u${bits}`);
  }
  throw new Error(`Unsupported primitive type: ${typeName}`);
}

/* ---- SchemaEncoderAptos class ---- */

export class SchemaEncoderAptos {
  public schema: SchemaItemWithSignature[];

  constructor(schema: string) {
    if (!schema || !schema.trim()) {
      this.schema = [];
      return;
    }
    // Basic normalization: replace "ipfsHash name" -> bytes32 name (if you used ipfs)
    const fixedSchema = schema.replace(/\bipfsHash\b/g, BYTES32);
    this.schema = parseSchema(fixedSchema);
  }

  /**
   * Encode a list of schema items (must match this.schema length and names/types)
   * Returns Uint8Array (BCS bytes)
   */
  public encodeData(params: SchemaItem[]): Uint8Array {
    if (params.length !== this.schema.length) {
      throw new Error("Invalid number of parameters");
    }

    const serializer = new Serializer();

    // iterate in schema order
    for (let i = 0; i < this.schema.length; i++) {
      const expected = this.schema[i];
      const provided = params[i];

      // check name if present
      if (expected.name && expected.name !== provided.name) {
        throw new Error(`Incompatible param name at index ${i}: expected ${expected.name} got ${provided.name}`);
      }

      // Sanitize type strings (allow whitespace differences)
      const expectedType = expected.type.replace(/\s+/g, "");
      const providedType = provided.type.replace(/\s+/g, "");
      if (expectedType !== providedType && providedType !== expected.signature.replace(/\s+/g, "")) {
        throw new Error(`Incompatible param type at index ${i}: expected ${expected.type} got ${provided.type}`);
      }

      // Serialize the value according to the expected type
      this.serializeValueByType(serializer, expected.type, provided.value);
    }

    return serializer.toUint8Array();
  }

  /**
   * Decode BCS bytes into the schema structure
   */
  public decodeData(bytes: Uint8Array): SchemaDecodedItem[] {
    const deser = new Deserializer(bytes.buffer ? bytes : new Uint8Array(bytes));

    const result: SchemaDecodedItem[] = [];
    for (const s of this.schema) {
      // decode according to s.type
      const value = this.deserializeValueByType(deser, s.type);
      result.push({
        name: s.name,
        type: s.type,
        signature: s.signature,
        value
      });
    }

    return result;
  }

  /**
   * Validate a schema string quickly by trying to construct a SchemaEncoderAptos
   */
  public static isSchemaValid(schema: string) {
    try {
      // Attempt to parse
      new SchemaEncoderAptos(schema);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate whether given bytes decode with the current schema (no deep value checks)
   */
  public isEncodedDataValid(bytes: Uint8Array) {
    try {
      this.decodeData(bytes);
      return true;
    } catch {
      return false;
    }
  }

  /* ---------------- internal helpers ---------------- */

  private serializeValueByType(serializer: Serializer, typeRaw: string, value: SchemaValue): void {
    const typeTrim = typeRaw.trim();

    // array case: endsWith []
    if (typeTrim.slice(-2) === "[]") {
      const innerType = typeTrim.slice(0, -2).trim();
      // expect value to be an array
      const arr = Array.isArray(value) ? (value as any[]) : [];
      // Serializer.serializeVector expects an array of Serializable or primitives handled below.
      // We'll write: serializeU32AsUleb128(len) then items.
      serializer.serializeU32AsUleb128(arr.length);
      for (const item of arr) {
        if (innerType.indexOf(`${TUPLE_TYPE}(`) === 0) {
          // tuple array: item should be object or array of values matching tuple components
          this.serializeTuple(serializer, innerType, item);
        } else {
          serializePrimitive(serializer, innerType, item);
        }
      }
      return;
    }

    // tuple (struct) case: startsWith tuple(
    if (typeTrim.indexOf(`${TUPLE_TYPE}(`) === 0) {
      // item is object or array
      this.serializeTuple(serializer, typeTrim, value);
      return;
    }

    // primitive
    serializePrimitive(serializer, typeTrim, value);
  }

  private serializeTuple(serializer: Serializer, tupleTypeRaw: string, value: SchemaValue) {
    // tupleTypeRaw looks like: "tuple(u64 score,address reviewer)" OR possibly "tuple(u64,address)"
    // Extract inner components
    const inside = tupleTypeRaw.slice(tupleTypeRaw.indexOf("(") + 1, tupleTypeRaw.lastIndexOf(")"));
    // split by commas at top level (no nested tuples supported in this parser)
    const compParts = inside.split(",").map((c) => stripWhitespace(c)).filter(Boolean);
    // For encoding, we only need the component types in order (names optional)
    const compTypes = compParts.map((p) => {
      // each part could be "u64 score" or "address"
      const tokens = p.split(/\s+/);
      return tokens.slice(0, tokens.length - (tokens.length > 1 ? 1 : 0)).join(" ") || tokens[0];
    });

    // value may be array of values or object with named keys
    let valuesArray: any[] = [];
    if (Array.isArray(value)) {
      valuesArray = value as any[];
    } else if (typeof value === "object" && value !== null) {
      // try to collect by component names if present
      // attempt to match by names if the tuple parts had names
      // compParts may include names, e.g., "u64 score" -> name "score"
      valuesArray = compParts.map((p) => {
        const tokens = p.split(/\s+/);
        if (tokens.length >= 2) {
          const name = tokens.slice(-1)[0];
          return (value as any)[name];
        }
        // unknown name -> undefined
        return undefined;
      });
    } else {
      throw new Error("Invalid tuple value: expected array or object");
    }

    // now serialize each component in order
    for (let k = 0; k < compTypes.length; k++) {
      const ct = compTypes[k];
      const v = valuesArray[k];
      // nested arrays or nested tuple not supported in this simple parser (but you can extend)
      if (ct.slice(-2) === "[]") {
        // vector of primitives inside tuple
        const inner = ct.slice(0, -2).trim();
        const arr = Array.isArray(v) ? v : [];
        serializer.serializeU32AsUleb128(arr.length);
        for (const item of arr) {
          if (inner.indexOf(`${TUPLE_TYPE}(`) === 0) {
            this.serializeTuple(serializer, inner, item);
          } else {
            serializePrimitive(serializer, inner, item);
          }
        }
      } else if (ct.indexOf(`${TUPLE_TYPE}(`) === 0) {
        this.serializeTuple(serializer, ct, v);
      } else {
        serializePrimitive(serializer, ct, v);
      }
    }
  }

  private deserializeValueByType(deser: Deserializer, typeRaw: string): any {
    const t = typeRaw.trim();
    if (t.slice(-2) === "[]") {
      const inner = t.slice(0, -2).trim();
      // read length (uleb128 as u32)
      const len = deser.deserializeUleb128AsU32();
      const arr: any[] = [];
      for (let i = 0; i < len; i++) {
        if (inner.indexOf(`${TUPLE_TYPE}(`) === 0) arr.push(this.deserializeTuple(deser, inner));
        else arr.push(deserializePrimitive(deser, inner));
      }
      return arr;
    }

    if (t.indexOf(`${TUPLE_TYPE}(`) === 0) {
      return this.deserializeTuple(deser, t);
    }

    // primitive
    return deserializePrimitive(deser, t);
  }

  private deserializeTuple(deser: Deserializer, tupleTypeRaw: string): any {
    const inside = tupleTypeRaw.slice(tupleTypeRaw.indexOf("(") + 1, tupleTypeRaw.lastIndexOf(")"));
    const compParts = inside.split(",").map((c) => stripWhitespace(c)).filter(Boolean);
    // build component descriptors: {type, name?}
    const comps = compParts.map((p) => {
      const tokens = p.split(/\s+/);
      if (tokens.length >= 2) {
        const typeToken = tokens.slice(0, -1).join(" ");
        const name = tokens.slice(-1)[0];
        return { type: typeToken, name };
      } else {
        return { type: tokens[0], name: "" };
      }
    });

    // decode fields in order
    const out: Record<string, any> = {};
    const arrOut: any[] = [];
    for (let i = 0; i < comps.length; i++) {
      const c = comps[i];
      const v = this.deserializeValueByType(deser, c.type);
      arrOut.push(v);
      out[c.name || String(i)] = v;
    }

    // return an object with names where available; also include array form would be fine.
    return out;
  }
}
