import { useMemo as e, useRef as t, useState as n } from "react";
import { Player as r } from "@remotion/player";
import { AbsoluteFill as i, Audio as a, Img as o, OffthreadVideo as s, Sequence as c, interpolate as l, staticFile as u, useCurrentFrame as d, useVideoConfig as f } from "remotion";
//#region \0rolldown/runtime.js
var p = (e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports), m;
(function(e) {
	e.assertEqual = (e) => e;
	function t(e) {}
	e.assertIs = t;
	function n(e) {
		throw Error();
	}
	e.assertNever = n, e.arrayToEnum = (e) => {
		let t = {};
		for (let n of e) t[n] = n;
		return t;
	}, e.getValidEnumValues = (t) => {
		let n = e.objectKeys(t).filter((e) => typeof t[t[e]] != "number"), r = {};
		for (let e of n) r[e] = t[e];
		return e.objectValues(r);
	}, e.objectValues = (t) => e.objectKeys(t).map(function(e) {
		return t[e];
	}), e.objectKeys = typeof Object.keys == "function" ? (e) => Object.keys(e) : (e) => {
		let t = [];
		for (let n in e) Object.prototype.hasOwnProperty.call(e, n) && t.push(n);
		return t;
	}, e.find = (e, t) => {
		for (let n of e) if (t(n)) return n;
	}, e.isInteger = typeof Number.isInteger == "function" ? (e) => Number.isInteger(e) : (e) => typeof e == "number" && isFinite(e) && Math.floor(e) === e;
	function r(e, t = " | ") {
		return e.map((e) => typeof e == "string" ? `'${e}'` : e).join(t);
	}
	e.joinValues = r, e.jsonStringifyReplacer = (e, t) => typeof t == "bigint" ? t.toString() : t;
})(m ||= {});
var h;
(function(e) {
	e.mergeShapes = (e, t) => ({
		...e,
		...t
	});
})(h ||= {});
var g = m.arrayToEnum([
	"string",
	"nan",
	"number",
	"integer",
	"float",
	"boolean",
	"date",
	"bigint",
	"symbol",
	"function",
	"undefined",
	"null",
	"array",
	"object",
	"unknown",
	"promise",
	"void",
	"never",
	"map",
	"set"
]), _ = (e) => {
	switch (typeof e) {
		case "undefined": return g.undefined;
		case "string": return g.string;
		case "number": return isNaN(e) ? g.nan : g.number;
		case "boolean": return g.boolean;
		case "function": return g.function;
		case "bigint": return g.bigint;
		case "symbol": return g.symbol;
		case "object": return Array.isArray(e) ? g.array : e === null ? g.null : e.then && typeof e.then == "function" && e.catch && typeof e.catch == "function" ? g.promise : typeof Map < "u" && e instanceof Map ? g.map : typeof Set < "u" && e instanceof Set ? g.set : typeof Date < "u" && e instanceof Date ? g.date : g.object;
		default: return g.unknown;
	}
}, v = m.arrayToEnum([
	"invalid_type",
	"invalid_literal",
	"custom",
	"invalid_union",
	"invalid_union_discriminator",
	"invalid_enum_value",
	"unrecognized_keys",
	"invalid_arguments",
	"invalid_return_type",
	"invalid_date",
	"invalid_string",
	"too_small",
	"too_big",
	"invalid_intersection_types",
	"not_multiple_of",
	"not_finite"
]), y = (e) => JSON.stringify(e, null, 2).replace(/"([^"]+)":/g, "$1:"), b = class extends Error {
	constructor(e) {
		super(), this.issues = [], this.addIssue = (e) => {
			this.issues = [...this.issues, e];
		}, this.addIssues = (e = []) => {
			this.issues = [...this.issues, ...e];
		};
		let t = new.target.prototype;
		Object.setPrototypeOf ? Object.setPrototypeOf(this, t) : this.__proto__ = t, this.name = "ZodError", this.issues = e;
	}
	get errors() {
		return this.issues;
	}
	format(e) {
		let t = e || function(e) {
			return e.message;
		}, n = { _errors: [] }, r = (e) => {
			for (let i of e.issues) if (i.code === "invalid_union") i.unionErrors.map(r);
			else if (i.code === "invalid_return_type") r(i.returnTypeError);
			else if (i.code === "invalid_arguments") r(i.argumentsError);
			else if (i.path.length === 0) n._errors.push(t(i));
			else {
				let e = n, r = 0;
				for (; r < i.path.length;) {
					let n = i.path[r];
					r === i.path.length - 1 ? (e[n] = e[n] || { _errors: [] }, e[n]._errors.push(t(i))) : e[n] = e[n] || { _errors: [] }, e = e[n], r++;
				}
			}
		};
		return r(this), n;
	}
	toString() {
		return this.message;
	}
	get message() {
		return JSON.stringify(this.issues, m.jsonStringifyReplacer, 2);
	}
	get isEmpty() {
		return this.issues.length === 0;
	}
	flatten(e = (e) => e.message) {
		let t = {}, n = [];
		for (let r of this.issues) r.path.length > 0 ? (t[r.path[0]] = t[r.path[0]] || [], t[r.path[0]].push(e(r))) : n.push(e(r));
		return {
			formErrors: n,
			fieldErrors: t
		};
	}
	get formErrors() {
		return this.flatten();
	}
};
b.create = (e) => new b(e);
var x = (e, t) => {
	let n;
	switch (e.code) {
		case v.invalid_type:
			n = e.received === g.undefined ? "Required" : `Expected ${e.expected}, received ${e.received}`;
			break;
		case v.invalid_literal:
			n = `Invalid literal value, expected ${JSON.stringify(e.expected, m.jsonStringifyReplacer)}`;
			break;
		case v.unrecognized_keys:
			n = `Unrecognized key(s) in object: ${m.joinValues(e.keys, ", ")}`;
			break;
		case v.invalid_union:
			n = "Invalid input";
			break;
		case v.invalid_union_discriminator:
			n = `Invalid discriminator value. Expected ${m.joinValues(e.options)}`;
			break;
		case v.invalid_enum_value:
			n = `Invalid enum value. Expected ${m.joinValues(e.options)}, received '${e.received}'`;
			break;
		case v.invalid_arguments:
			n = "Invalid function arguments";
			break;
		case v.invalid_return_type:
			n = "Invalid function return type";
			break;
		case v.invalid_date:
			n = "Invalid date";
			break;
		case v.invalid_string:
			typeof e.validation == "object" ? "includes" in e.validation ? (n = `Invalid input: must include "${e.validation.includes}"`, typeof e.validation.position == "number" && (n = `${n} at one or more positions greater than or equal to ${e.validation.position}`)) : "startsWith" in e.validation ? n = `Invalid input: must start with "${e.validation.startsWith}"` : "endsWith" in e.validation ? n = `Invalid input: must end with "${e.validation.endsWith}"` : m.assertNever(e.validation) : n = e.validation === "regex" ? "Invalid" : `Invalid ${e.validation}`;
			break;
		case v.too_small:
			n = e.type === "array" ? `Array must contain ${e.exact ? "exactly" : e.inclusive ? "at least" : "more than"} ${e.minimum} element(s)` : e.type === "string" ? `String must contain ${e.exact ? "exactly" : e.inclusive ? "at least" : "over"} ${e.minimum} character(s)` : e.type === "number" ? `Number must be ${e.exact ? "exactly equal to " : e.inclusive ? "greater than or equal to " : "greater than "}${e.minimum}` : e.type === "date" ? `Date must be ${e.exact ? "exactly equal to " : e.inclusive ? "greater than or equal to " : "greater than "}${new Date(Number(e.minimum))}` : "Invalid input";
			break;
		case v.too_big:
			n = e.type === "array" ? `Array must contain ${e.exact ? "exactly" : e.inclusive ? "at most" : "less than"} ${e.maximum} element(s)` : e.type === "string" ? `String must contain ${e.exact ? "exactly" : e.inclusive ? "at most" : "under"} ${e.maximum} character(s)` : e.type === "number" ? `Number must be ${e.exact ? "exactly" : e.inclusive ? "less than or equal to" : "less than"} ${e.maximum}` : e.type === "bigint" ? `BigInt must be ${e.exact ? "exactly" : e.inclusive ? "less than or equal to" : "less than"} ${e.maximum}` : e.type === "date" ? `Date must be ${e.exact ? "exactly" : e.inclusive ? "smaller than or equal to" : "smaller than"} ${new Date(Number(e.maximum))}` : "Invalid input";
			break;
		case v.custom:
			n = "Invalid input";
			break;
		case v.invalid_intersection_types:
			n = "Intersection results could not be merged";
			break;
		case v.not_multiple_of:
			n = `Number must be a multiple of ${e.multipleOf}`;
			break;
		case v.not_finite:
			n = "Number must be finite";
			break;
		default: n = t.defaultError, m.assertNever(e);
	}
	return { message: n };
}, S = x;
function C(e) {
	S = e;
}
function w() {
	return S;
}
var T = (e) => {
	let { data: t, path: n, errorMaps: r, issueData: i } = e, a = [...n, ...i.path || []], o = {
		...i,
		path: a
	}, s = "", c = r.filter((e) => !!e).slice().reverse();
	for (let e of c) s = e(o, {
		data: t,
		defaultError: s
	}).message;
	return {
		...i,
		path: a,
		message: i.message || s
	};
}, ee = [];
function E(e, t) {
	let n = T({
		issueData: t,
		data: e.data,
		path: e.path,
		errorMaps: [
			e.common.contextualErrorMap,
			e.schemaErrorMap,
			w(),
			x
		].filter((e) => !!e)
	});
	e.common.issues.push(n);
}
var D = class e {
	constructor() {
		this.value = "valid";
	}
	dirty() {
		this.value === "valid" && (this.value = "dirty");
	}
	abort() {
		this.value !== "aborted" && (this.value = "aborted");
	}
	static mergeArray(e, t) {
		let n = [];
		for (let r of t) {
			if (r.status === "aborted") return O;
			r.status === "dirty" && e.dirty(), n.push(r.value);
		}
		return {
			status: e.value,
			value: n
		};
	}
	static async mergeObjectAsync(t, n) {
		let r = [];
		for (let e of n) r.push({
			key: await e.key,
			value: await e.value
		});
		return e.mergeObjectSync(t, r);
	}
	static mergeObjectSync(e, t) {
		let n = {};
		for (let r of t) {
			let { key: t, value: i } = r;
			if (t.status === "aborted" || i.status === "aborted") return O;
			t.status === "dirty" && e.dirty(), i.status === "dirty" && e.dirty(), t.value !== "__proto__" && (i.value !== void 0 || r.alwaysSet) && (n[t.value] = i.value);
		}
		return {
			status: e.value,
			value: n
		};
	}
}, O = Object.freeze({ status: "aborted" }), te = (e) => ({
	status: "dirty",
	value: e
}), k = (e) => ({
	status: "valid",
	value: e
}), ne = (e) => e.status === "aborted", re = (e) => e.status === "dirty", A = (e) => e.status === "valid", ie = (e) => typeof Promise < "u" && e instanceof Promise, j;
(function(e) {
	e.errToObj = (e) => typeof e == "string" ? { message: e } : e || {}, e.toString = (e) => typeof e == "string" ? e : e?.message;
})(j ||= {});
var M = class {
	constructor(e, t, n, r) {
		this._cachedPath = [], this.parent = e, this.data = t, this._path = n, this._key = r;
	}
	get path() {
		return this._cachedPath.length || (this._key instanceof Array ? this._cachedPath.push(...this._path, ...this._key) : this._cachedPath.push(...this._path, this._key)), this._cachedPath;
	}
}, ae = (e, t) => {
	if (A(t)) return {
		success: !0,
		data: t.value
	};
	if (!e.common.issues.length) throw Error("Validation failed but no issues detected.");
	return {
		success: !1,
		get error() {
			return this._error ||= new b(e.common.issues), this._error;
		}
	};
};
function N(e) {
	if (!e) return {};
	let { errorMap: t, invalid_type_error: n, required_error: r, description: i } = e;
	if (t && (n || r)) throw Error("Can't use \"invalid_type_error\" or \"required_error\" in conjunction with custom error map.");
	return t ? {
		errorMap: t,
		description: i
	} : {
		errorMap: (e, t) => e.code === "invalid_type" ? t.data === void 0 ? { message: r ?? t.defaultError } : { message: n ?? t.defaultError } : { message: t.defaultError },
		description: i
	};
}
var P = class {
	constructor(e) {
		this.spa = this.safeParseAsync, this._def = e, this.parse = this.parse.bind(this), this.safeParse = this.safeParse.bind(this), this.parseAsync = this.parseAsync.bind(this), this.safeParseAsync = this.safeParseAsync.bind(this), this.spa = this.spa.bind(this), this.refine = this.refine.bind(this), this.refinement = this.refinement.bind(this), this.superRefine = this.superRefine.bind(this), this.optional = this.optional.bind(this), this.nullable = this.nullable.bind(this), this.nullish = this.nullish.bind(this), this.array = this.array.bind(this), this.promise = this.promise.bind(this), this.or = this.or.bind(this), this.and = this.and.bind(this), this.transform = this.transform.bind(this), this.brand = this.brand.bind(this), this.default = this.default.bind(this), this.catch = this.catch.bind(this), this.describe = this.describe.bind(this), this.pipe = this.pipe.bind(this), this.readonly = this.readonly.bind(this), this.isNullable = this.isNullable.bind(this), this.isOptional = this.isOptional.bind(this);
	}
	get description() {
		return this._def.description;
	}
	_getType(e) {
		return _(e.data);
	}
	_getOrReturnCtx(e, t) {
		return t || {
			common: e.parent.common,
			data: e.data,
			parsedType: _(e.data),
			schemaErrorMap: this._def.errorMap,
			path: e.path,
			parent: e.parent
		};
	}
	_processInputParams(e) {
		return {
			status: new D(),
			ctx: {
				common: e.parent.common,
				data: e.data,
				parsedType: _(e.data),
				schemaErrorMap: this._def.errorMap,
				path: e.path,
				parent: e.parent
			}
		};
	}
	_parseSync(e) {
		let t = this._parse(e);
		if (ie(t)) throw Error("Synchronous parse encountered promise.");
		return t;
	}
	_parseAsync(e) {
		let t = this._parse(e);
		return Promise.resolve(t);
	}
	parse(e, t) {
		let n = this.safeParse(e, t);
		if (n.success) return n.data;
		throw n.error;
	}
	safeParse(e, t) {
		let n = {
			common: {
				issues: [],
				async: t?.async ?? !1,
				contextualErrorMap: t?.errorMap
			},
			path: t?.path || [],
			schemaErrorMap: this._def.errorMap,
			parent: null,
			data: e,
			parsedType: _(e)
		};
		return ae(n, this._parseSync({
			data: e,
			path: n.path,
			parent: n
		}));
	}
	async parseAsync(e, t) {
		let n = await this.safeParseAsync(e, t);
		if (n.success) return n.data;
		throw n.error;
	}
	async safeParseAsync(e, t) {
		let n = {
			common: {
				issues: [],
				contextualErrorMap: t?.errorMap,
				async: !0
			},
			path: t?.path || [],
			schemaErrorMap: this._def.errorMap,
			parent: null,
			data: e,
			parsedType: _(e)
		}, r = this._parse({
			data: e,
			path: n.path,
			parent: n
		});
		return ae(n, await (ie(r) ? r : Promise.resolve(r)));
	}
	refine(e, t) {
		let n = (e) => typeof t == "string" || t === void 0 ? { message: t } : typeof t == "function" ? t(e) : t;
		return this._refinement((t, r) => {
			let i = e(t), a = () => r.addIssue({
				code: v.custom,
				...n(t)
			});
			return typeof Promise < "u" && i instanceof Promise ? i.then((e) => e ? !0 : (a(), !1)) : i ? !0 : (a(), !1);
		});
	}
	refinement(e, t) {
		return this._refinement((n, r) => e(n) ? !0 : (r.addIssue(typeof t == "function" ? t(n, r) : t), !1));
	}
	_refinement(e) {
		return new Y({
			schema: this,
			typeName: Q.ZodEffects,
			effect: {
				type: "refinement",
				refinement: e
			}
		});
	}
	superRefine(e) {
		return this._refinement(e);
	}
	optional() {
		return X.create(this, this._def);
	}
	nullable() {
		return Z.create(this, this._def);
	}
	nullish() {
		return this.nullable().optional();
	}
	array() {
		return H.create(this, this._def);
	}
	promise() {
		return J.create(this, this._def);
	}
	or(e) {
		return G.create([this, e], this._def);
	}
	and(e) {
		return K.create(this, e, this._def);
	}
	transform(e) {
		return new Y({
			...N(this._def),
			schema: this,
			typeName: Q.ZodEffects,
			effect: {
				type: "transform",
				transform: e
			}
		});
	}
	default(e) {
		let t = typeof e == "function" ? e : () => e;
		return new Pe({
			...N(this._def),
			innerType: this,
			defaultValue: t,
			typeName: Q.ZodDefault
		});
	}
	brand() {
		return new Re({
			typeName: Q.ZodBranded,
			type: this,
			...N(this._def)
		});
	}
	catch(e) {
		let t = typeof e == "function" ? e : () => e;
		return new Fe({
			...N(this._def),
			innerType: this,
			catchValue: t,
			typeName: Q.ZodCatch
		});
	}
	describe(e) {
		let t = this.constructor;
		return new t({
			...this._def,
			description: e
		});
	}
	pipe(e) {
		return ze.create(this, e);
	}
	readonly() {
		return Be.create(this);
	}
	isOptional() {
		return this.safeParse(void 0).success;
	}
	isNullable() {
		return this.safeParse(null).success;
	}
}, oe = /^c[^\s-]{8,}$/i, se = /^[a-z][a-z0-9]*$/, ce = /[0-9A-HJKMNP-TV-Z]{26}/, le = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i, ue = /^(?!\.)(?!.*\.\.)([A-Z0-9_+-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i, de = /^(\p{Extended_Pictographic}|\p{Emoji_Component})+$/u, fe = /^(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))$/, pe = /^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/, me = (e) => e.precision ? e.offset ? RegExp(`^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{${e.precision}}(([+-]\\d{2}(:?\\d{2})?)|Z)$`) : RegExp(`^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{${e.precision}}Z$`) : e.precision === 0 ? e.offset ? RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(([+-]\\d{2}(:?\\d{2})?)|Z)$") : RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$") : e.offset ? RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?(([+-]\\d{2}(:?\\d{2})?)|Z)$") : RegExp("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?Z$");
function he(e, t) {
	return !!((t === "v4" || !t) && fe.test(e) || (t === "v6" || !t) && pe.test(e));
}
var F = class e extends P {
	constructor() {
		super(...arguments), this._regex = (e, t, n) => this.refinement((t) => e.test(t), {
			validation: t,
			code: v.invalid_string,
			...j.errToObj(n)
		}), this.nonempty = (e) => this.min(1, j.errToObj(e)), this.trim = () => new e({
			...this._def,
			checks: [...this._def.checks, { kind: "trim" }]
		}), this.toLowerCase = () => new e({
			...this._def,
			checks: [...this._def.checks, { kind: "toLowerCase" }]
		}), this.toUpperCase = () => new e({
			...this._def,
			checks: [...this._def.checks, { kind: "toUpperCase" }]
		});
	}
	_parse(e) {
		if (this._def.coerce && (e.data = String(e.data)), this._getType(e) !== g.string) {
			let t = this._getOrReturnCtx(e);
			return E(t, {
				code: v.invalid_type,
				expected: g.string,
				received: t.parsedType
			}), O;
		}
		let t = new D(), n;
		for (let r of this._def.checks) if (r.kind === "min") e.data.length < r.value && (n = this._getOrReturnCtx(e, n), E(n, {
			code: v.too_small,
			minimum: r.value,
			type: "string",
			inclusive: !0,
			exact: !1,
			message: r.message
		}), t.dirty());
		else if (r.kind === "max") e.data.length > r.value && (n = this._getOrReturnCtx(e, n), E(n, {
			code: v.too_big,
			maximum: r.value,
			type: "string",
			inclusive: !0,
			exact: !1,
			message: r.message
		}), t.dirty());
		else if (r.kind === "length") {
			let i = e.data.length > r.value, a = e.data.length < r.value;
			(i || a) && (n = this._getOrReturnCtx(e, n), i ? E(n, {
				code: v.too_big,
				maximum: r.value,
				type: "string",
				inclusive: !0,
				exact: !0,
				message: r.message
			}) : a && E(n, {
				code: v.too_small,
				minimum: r.value,
				type: "string",
				inclusive: !0,
				exact: !0,
				message: r.message
			}), t.dirty());
		} else if (r.kind === "email") ue.test(e.data) || (n = this._getOrReturnCtx(e, n), E(n, {
			validation: "email",
			code: v.invalid_string,
			message: r.message
		}), t.dirty());
		else if (r.kind === "emoji") de.test(e.data) || (n = this._getOrReturnCtx(e, n), E(n, {
			validation: "emoji",
			code: v.invalid_string,
			message: r.message
		}), t.dirty());
		else if (r.kind === "uuid") le.test(e.data) || (n = this._getOrReturnCtx(e, n), E(n, {
			validation: "uuid",
			code: v.invalid_string,
			message: r.message
		}), t.dirty());
		else if (r.kind === "cuid") oe.test(e.data) || (n = this._getOrReturnCtx(e, n), E(n, {
			validation: "cuid",
			code: v.invalid_string,
			message: r.message
		}), t.dirty());
		else if (r.kind === "cuid2") se.test(e.data) || (n = this._getOrReturnCtx(e, n), E(n, {
			validation: "cuid2",
			code: v.invalid_string,
			message: r.message
		}), t.dirty());
		else if (r.kind === "ulid") ce.test(e.data) || (n = this._getOrReturnCtx(e, n), E(n, {
			validation: "ulid",
			code: v.invalid_string,
			message: r.message
		}), t.dirty());
		else if (r.kind === "url") try {
			new URL(e.data);
		} catch {
			n = this._getOrReturnCtx(e, n), E(n, {
				validation: "url",
				code: v.invalid_string,
				message: r.message
			}), t.dirty();
		}
		else r.kind === "regex" ? (r.regex.lastIndex = 0, r.regex.test(e.data) || (n = this._getOrReturnCtx(e, n), E(n, {
			validation: "regex",
			code: v.invalid_string,
			message: r.message
		}), t.dirty())) : r.kind === "trim" ? e.data = e.data.trim() : r.kind === "includes" ? e.data.includes(r.value, r.position) || (n = this._getOrReturnCtx(e, n), E(n, {
			code: v.invalid_string,
			validation: {
				includes: r.value,
				position: r.position
			},
			message: r.message
		}), t.dirty()) : r.kind === "toLowerCase" ? e.data = e.data.toLowerCase() : r.kind === "toUpperCase" ? e.data = e.data.toUpperCase() : r.kind === "startsWith" ? e.data.startsWith(r.value) || (n = this._getOrReturnCtx(e, n), E(n, {
			code: v.invalid_string,
			validation: { startsWith: r.value },
			message: r.message
		}), t.dirty()) : r.kind === "endsWith" ? e.data.endsWith(r.value) || (n = this._getOrReturnCtx(e, n), E(n, {
			code: v.invalid_string,
			validation: { endsWith: r.value },
			message: r.message
		}), t.dirty()) : r.kind === "datetime" ? me(r).test(e.data) || (n = this._getOrReturnCtx(e, n), E(n, {
			code: v.invalid_string,
			validation: "datetime",
			message: r.message
		}), t.dirty()) : r.kind === "ip" ? he(e.data, r.version) || (n = this._getOrReturnCtx(e, n), E(n, {
			validation: "ip",
			code: v.invalid_string,
			message: r.message
		}), t.dirty()) : m.assertNever(r);
		return {
			status: t.value,
			value: e.data
		};
	}
	_addCheck(t) {
		return new e({
			...this._def,
			checks: [...this._def.checks, t]
		});
	}
	email(e) {
		return this._addCheck({
			kind: "email",
			...j.errToObj(e)
		});
	}
	url(e) {
		return this._addCheck({
			kind: "url",
			...j.errToObj(e)
		});
	}
	emoji(e) {
		return this._addCheck({
			kind: "emoji",
			...j.errToObj(e)
		});
	}
	uuid(e) {
		return this._addCheck({
			kind: "uuid",
			...j.errToObj(e)
		});
	}
	cuid(e) {
		return this._addCheck({
			kind: "cuid",
			...j.errToObj(e)
		});
	}
	cuid2(e) {
		return this._addCheck({
			kind: "cuid2",
			...j.errToObj(e)
		});
	}
	ulid(e) {
		return this._addCheck({
			kind: "ulid",
			...j.errToObj(e)
		});
	}
	ip(e) {
		return this._addCheck({
			kind: "ip",
			...j.errToObj(e)
		});
	}
	datetime(e) {
		return typeof e == "string" ? this._addCheck({
			kind: "datetime",
			precision: null,
			offset: !1,
			message: e
		}) : this._addCheck({
			kind: "datetime",
			precision: e?.precision === void 0 ? null : e?.precision,
			offset: e?.offset ?? !1,
			...j.errToObj(e?.message)
		});
	}
	regex(e, t) {
		return this._addCheck({
			kind: "regex",
			regex: e,
			...j.errToObj(t)
		});
	}
	includes(e, t) {
		return this._addCheck({
			kind: "includes",
			value: e,
			position: t?.position,
			...j.errToObj(t?.message)
		});
	}
	startsWith(e, t) {
		return this._addCheck({
			kind: "startsWith",
			value: e,
			...j.errToObj(t)
		});
	}
	endsWith(e, t) {
		return this._addCheck({
			kind: "endsWith",
			value: e,
			...j.errToObj(t)
		});
	}
	min(e, t) {
		return this._addCheck({
			kind: "min",
			value: e,
			...j.errToObj(t)
		});
	}
	max(e, t) {
		return this._addCheck({
			kind: "max",
			value: e,
			...j.errToObj(t)
		});
	}
	length(e, t) {
		return this._addCheck({
			kind: "length",
			value: e,
			...j.errToObj(t)
		});
	}
	get isDatetime() {
		return !!this._def.checks.find((e) => e.kind === "datetime");
	}
	get isEmail() {
		return !!this._def.checks.find((e) => e.kind === "email");
	}
	get isURL() {
		return !!this._def.checks.find((e) => e.kind === "url");
	}
	get isEmoji() {
		return !!this._def.checks.find((e) => e.kind === "emoji");
	}
	get isUUID() {
		return !!this._def.checks.find((e) => e.kind === "uuid");
	}
	get isCUID() {
		return !!this._def.checks.find((e) => e.kind === "cuid");
	}
	get isCUID2() {
		return !!this._def.checks.find((e) => e.kind === "cuid2");
	}
	get isULID() {
		return !!this._def.checks.find((e) => e.kind === "ulid");
	}
	get isIP() {
		return !!this._def.checks.find((e) => e.kind === "ip");
	}
	get minLength() {
		let e = null;
		for (let t of this._def.checks) t.kind === "min" && (e === null || t.value > e) && (e = t.value);
		return e;
	}
	get maxLength() {
		let e = null;
		for (let t of this._def.checks) t.kind === "max" && (e === null || t.value < e) && (e = t.value);
		return e;
	}
};
F.create = (e) => new F({
	checks: [],
	typeName: Q.ZodString,
	coerce: e?.coerce ?? !1,
	...N(e)
});
function ge(e, t) {
	let n = (e.toString().split(".")[1] || "").length, r = (t.toString().split(".")[1] || "").length, i = n > r ? n : r;
	return parseInt(e.toFixed(i).replace(".", "")) % parseInt(t.toFixed(i).replace(".", "")) / 10 ** i;
}
var _e = class e extends P {
	constructor() {
		super(...arguments), this.min = this.gte, this.max = this.lte, this.step = this.multipleOf;
	}
	_parse(e) {
		if (this._def.coerce && (e.data = Number(e.data)), this._getType(e) !== g.number) {
			let t = this._getOrReturnCtx(e);
			return E(t, {
				code: v.invalid_type,
				expected: g.number,
				received: t.parsedType
			}), O;
		}
		let t, n = new D();
		for (let r of this._def.checks) r.kind === "int" ? m.isInteger(e.data) || (t = this._getOrReturnCtx(e, t), E(t, {
			code: v.invalid_type,
			expected: "integer",
			received: "float",
			message: r.message
		}), n.dirty()) : r.kind === "min" ? (r.inclusive ? e.data < r.value : e.data <= r.value) && (t = this._getOrReturnCtx(e, t), E(t, {
			code: v.too_small,
			minimum: r.value,
			type: "number",
			inclusive: r.inclusive,
			exact: !1,
			message: r.message
		}), n.dirty()) : r.kind === "max" ? (r.inclusive ? e.data > r.value : e.data >= r.value) && (t = this._getOrReturnCtx(e, t), E(t, {
			code: v.too_big,
			maximum: r.value,
			type: "number",
			inclusive: r.inclusive,
			exact: !1,
			message: r.message
		}), n.dirty()) : r.kind === "multipleOf" ? ge(e.data, r.value) !== 0 && (t = this._getOrReturnCtx(e, t), E(t, {
			code: v.not_multiple_of,
			multipleOf: r.value,
			message: r.message
		}), n.dirty()) : r.kind === "finite" ? Number.isFinite(e.data) || (t = this._getOrReturnCtx(e, t), E(t, {
			code: v.not_finite,
			message: r.message
		}), n.dirty()) : m.assertNever(r);
		return {
			status: n.value,
			value: e.data
		};
	}
	gte(e, t) {
		return this.setLimit("min", e, !0, j.toString(t));
	}
	gt(e, t) {
		return this.setLimit("min", e, !1, j.toString(t));
	}
	lte(e, t) {
		return this.setLimit("max", e, !0, j.toString(t));
	}
	lt(e, t) {
		return this.setLimit("max", e, !1, j.toString(t));
	}
	setLimit(t, n, r, i) {
		return new e({
			...this._def,
			checks: [...this._def.checks, {
				kind: t,
				value: n,
				inclusive: r,
				message: j.toString(i)
			}]
		});
	}
	_addCheck(t) {
		return new e({
			...this._def,
			checks: [...this._def.checks, t]
		});
	}
	int(e) {
		return this._addCheck({
			kind: "int",
			message: j.toString(e)
		});
	}
	positive(e) {
		return this._addCheck({
			kind: "min",
			value: 0,
			inclusive: !1,
			message: j.toString(e)
		});
	}
	negative(e) {
		return this._addCheck({
			kind: "max",
			value: 0,
			inclusive: !1,
			message: j.toString(e)
		});
	}
	nonpositive(e) {
		return this._addCheck({
			kind: "max",
			value: 0,
			inclusive: !0,
			message: j.toString(e)
		});
	}
	nonnegative(e) {
		return this._addCheck({
			kind: "min",
			value: 0,
			inclusive: !0,
			message: j.toString(e)
		});
	}
	multipleOf(e, t) {
		return this._addCheck({
			kind: "multipleOf",
			value: e,
			message: j.toString(t)
		});
	}
	finite(e) {
		return this._addCheck({
			kind: "finite",
			message: j.toString(e)
		});
	}
	safe(e) {
		return this._addCheck({
			kind: "min",
			inclusive: !0,
			value: -(2 ** 53 - 1),
			message: j.toString(e)
		})._addCheck({
			kind: "max",
			inclusive: !0,
			value: 2 ** 53 - 1,
			message: j.toString(e)
		});
	}
	get minValue() {
		let e = null;
		for (let t of this._def.checks) t.kind === "min" && (e === null || t.value > e) && (e = t.value);
		return e;
	}
	get maxValue() {
		let e = null;
		for (let t of this._def.checks) t.kind === "max" && (e === null || t.value < e) && (e = t.value);
		return e;
	}
	get isInt() {
		return !!this._def.checks.find((e) => e.kind === "int" || e.kind === "multipleOf" && m.isInteger(e.value));
	}
	get isFinite() {
		let e = null, t = null;
		for (let n of this._def.checks) if (n.kind === "finite" || n.kind === "int" || n.kind === "multipleOf") return !0;
		else n.kind === "min" ? (t === null || n.value > t) && (t = n.value) : n.kind === "max" && (e === null || n.value < e) && (e = n.value);
		return Number.isFinite(t) && Number.isFinite(e);
	}
};
_e.create = (e) => new _e({
	checks: [],
	typeName: Q.ZodNumber,
	coerce: e?.coerce || !1,
	...N(e)
});
var I = class e extends P {
	constructor() {
		super(...arguments), this.min = this.gte, this.max = this.lte;
	}
	_parse(e) {
		if (this._def.coerce && (e.data = BigInt(e.data)), this._getType(e) !== g.bigint) {
			let t = this._getOrReturnCtx(e);
			return E(t, {
				code: v.invalid_type,
				expected: g.bigint,
				received: t.parsedType
			}), O;
		}
		let t, n = new D();
		for (let r of this._def.checks) r.kind === "min" ? (r.inclusive ? e.data < r.value : e.data <= r.value) && (t = this._getOrReturnCtx(e, t), E(t, {
			code: v.too_small,
			type: "bigint",
			minimum: r.value,
			inclusive: r.inclusive,
			message: r.message
		}), n.dirty()) : r.kind === "max" ? (r.inclusive ? e.data > r.value : e.data >= r.value) && (t = this._getOrReturnCtx(e, t), E(t, {
			code: v.too_big,
			type: "bigint",
			maximum: r.value,
			inclusive: r.inclusive,
			message: r.message
		}), n.dirty()) : r.kind === "multipleOf" ? e.data % r.value !== BigInt(0) && (t = this._getOrReturnCtx(e, t), E(t, {
			code: v.not_multiple_of,
			multipleOf: r.value,
			message: r.message
		}), n.dirty()) : m.assertNever(r);
		return {
			status: n.value,
			value: e.data
		};
	}
	gte(e, t) {
		return this.setLimit("min", e, !0, j.toString(t));
	}
	gt(e, t) {
		return this.setLimit("min", e, !1, j.toString(t));
	}
	lte(e, t) {
		return this.setLimit("max", e, !0, j.toString(t));
	}
	lt(e, t) {
		return this.setLimit("max", e, !1, j.toString(t));
	}
	setLimit(t, n, r, i) {
		return new e({
			...this._def,
			checks: [...this._def.checks, {
				kind: t,
				value: n,
				inclusive: r,
				message: j.toString(i)
			}]
		});
	}
	_addCheck(t) {
		return new e({
			...this._def,
			checks: [...this._def.checks, t]
		});
	}
	positive(e) {
		return this._addCheck({
			kind: "min",
			value: BigInt(0),
			inclusive: !1,
			message: j.toString(e)
		});
	}
	negative(e) {
		return this._addCheck({
			kind: "max",
			value: BigInt(0),
			inclusive: !1,
			message: j.toString(e)
		});
	}
	nonpositive(e) {
		return this._addCheck({
			kind: "max",
			value: BigInt(0),
			inclusive: !0,
			message: j.toString(e)
		});
	}
	nonnegative(e) {
		return this._addCheck({
			kind: "min",
			value: BigInt(0),
			inclusive: !0,
			message: j.toString(e)
		});
	}
	multipleOf(e, t) {
		return this._addCheck({
			kind: "multipleOf",
			value: e,
			message: j.toString(t)
		});
	}
	get minValue() {
		let e = null;
		for (let t of this._def.checks) t.kind === "min" && (e === null || t.value > e) && (e = t.value);
		return e;
	}
	get maxValue() {
		let e = null;
		for (let t of this._def.checks) t.kind === "max" && (e === null || t.value < e) && (e = t.value);
		return e;
	}
};
I.create = (e) => new I({
	checks: [],
	typeName: Q.ZodBigInt,
	coerce: e?.coerce ?? !1,
	...N(e)
});
var L = class extends P {
	_parse(e) {
		if (this._def.coerce && (e.data = !!e.data), this._getType(e) !== g.boolean) {
			let t = this._getOrReturnCtx(e);
			return E(t, {
				code: v.invalid_type,
				expected: g.boolean,
				received: t.parsedType
			}), O;
		}
		return k(e.data);
	}
};
L.create = (e) => new L({
	typeName: Q.ZodBoolean,
	coerce: e?.coerce || !1,
	...N(e)
});
var R = class e extends P {
	_parse(e) {
		if (this._def.coerce && (e.data = new Date(e.data)), this._getType(e) !== g.date) {
			let t = this._getOrReturnCtx(e);
			return E(t, {
				code: v.invalid_type,
				expected: g.date,
				received: t.parsedType
			}), O;
		}
		if (isNaN(e.data.getTime())) return E(this._getOrReturnCtx(e), { code: v.invalid_date }), O;
		let t = new D(), n;
		for (let r of this._def.checks) r.kind === "min" ? e.data.getTime() < r.value && (n = this._getOrReturnCtx(e, n), E(n, {
			code: v.too_small,
			message: r.message,
			inclusive: !0,
			exact: !1,
			minimum: r.value,
			type: "date"
		}), t.dirty()) : r.kind === "max" ? e.data.getTime() > r.value && (n = this._getOrReturnCtx(e, n), E(n, {
			code: v.too_big,
			message: r.message,
			inclusive: !0,
			exact: !1,
			maximum: r.value,
			type: "date"
		}), t.dirty()) : m.assertNever(r);
		return {
			status: t.value,
			value: new Date(e.data.getTime())
		};
	}
	_addCheck(t) {
		return new e({
			...this._def,
			checks: [...this._def.checks, t]
		});
	}
	min(e, t) {
		return this._addCheck({
			kind: "min",
			value: e.getTime(),
			message: j.toString(t)
		});
	}
	max(e, t) {
		return this._addCheck({
			kind: "max",
			value: e.getTime(),
			message: j.toString(t)
		});
	}
	get minDate() {
		let e = null;
		for (let t of this._def.checks) t.kind === "min" && (e === null || t.value > e) && (e = t.value);
		return e == null ? null : new Date(e);
	}
	get maxDate() {
		let e = null;
		for (let t of this._def.checks) t.kind === "max" && (e === null || t.value < e) && (e = t.value);
		return e == null ? null : new Date(e);
	}
};
R.create = (e) => new R({
	checks: [],
	coerce: e?.coerce || !1,
	typeName: Q.ZodDate,
	...N(e)
});
var ve = class extends P {
	_parse(e) {
		if (this._getType(e) !== g.symbol) {
			let t = this._getOrReturnCtx(e);
			return E(t, {
				code: v.invalid_type,
				expected: g.symbol,
				received: t.parsedType
			}), O;
		}
		return k(e.data);
	}
};
ve.create = (e) => new ve({
	typeName: Q.ZodSymbol,
	...N(e)
});
var ye = class extends P {
	_parse(e) {
		if (this._getType(e) !== g.undefined) {
			let t = this._getOrReturnCtx(e);
			return E(t, {
				code: v.invalid_type,
				expected: g.undefined,
				received: t.parsedType
			}), O;
		}
		return k(e.data);
	}
};
ye.create = (e) => new ye({
	typeName: Q.ZodUndefined,
	...N(e)
});
var be = class extends P {
	_parse(e) {
		if (this._getType(e) !== g.null) {
			let t = this._getOrReturnCtx(e);
			return E(t, {
				code: v.invalid_type,
				expected: g.null,
				received: t.parsedType
			}), O;
		}
		return k(e.data);
	}
};
be.create = (e) => new be({
	typeName: Q.ZodNull,
	...N(e)
});
var z = class extends P {
	constructor() {
		super(...arguments), this._any = !0;
	}
	_parse(e) {
		return k(e.data);
	}
};
z.create = (e) => new z({
	typeName: Q.ZodAny,
	...N(e)
});
var B = class extends P {
	constructor() {
		super(...arguments), this._unknown = !0;
	}
	_parse(e) {
		return k(e.data);
	}
};
B.create = (e) => new B({
	typeName: Q.ZodUnknown,
	...N(e)
});
var V = class extends P {
	_parse(e) {
		let t = this._getOrReturnCtx(e);
		return E(t, {
			code: v.invalid_type,
			expected: g.never,
			received: t.parsedType
		}), O;
	}
};
V.create = (e) => new V({
	typeName: Q.ZodNever,
	...N(e)
});
var xe = class extends P {
	_parse(e) {
		if (this._getType(e) !== g.undefined) {
			let t = this._getOrReturnCtx(e);
			return E(t, {
				code: v.invalid_type,
				expected: g.void,
				received: t.parsedType
			}), O;
		}
		return k(e.data);
	}
};
xe.create = (e) => new xe({
	typeName: Q.ZodVoid,
	...N(e)
});
var H = class e extends P {
	_parse(e) {
		let { ctx: t, status: n } = this._processInputParams(e), r = this._def;
		if (t.parsedType !== g.array) return E(t, {
			code: v.invalid_type,
			expected: g.array,
			received: t.parsedType
		}), O;
		if (r.exactLength !== null) {
			let e = t.data.length > r.exactLength.value, i = t.data.length < r.exactLength.value;
			(e || i) && (E(t, {
				code: e ? v.too_big : v.too_small,
				minimum: i ? r.exactLength.value : void 0,
				maximum: e ? r.exactLength.value : void 0,
				type: "array",
				inclusive: !0,
				exact: !0,
				message: r.exactLength.message
			}), n.dirty());
		}
		if (r.minLength !== null && t.data.length < r.minLength.value && (E(t, {
			code: v.too_small,
			minimum: r.minLength.value,
			type: "array",
			inclusive: !0,
			exact: !1,
			message: r.minLength.message
		}), n.dirty()), r.maxLength !== null && t.data.length > r.maxLength.value && (E(t, {
			code: v.too_big,
			maximum: r.maxLength.value,
			type: "array",
			inclusive: !0,
			exact: !1,
			message: r.maxLength.message
		}), n.dirty()), t.common.async) return Promise.all([...t.data].map((e, n) => r.type._parseAsync(new M(t, e, t.path, n)))).then((e) => D.mergeArray(n, e));
		let i = [...t.data].map((e, n) => r.type._parseSync(new M(t, e, t.path, n)));
		return D.mergeArray(n, i);
	}
	get element() {
		return this._def.type;
	}
	min(t, n) {
		return new e({
			...this._def,
			minLength: {
				value: t,
				message: j.toString(n)
			}
		});
	}
	max(t, n) {
		return new e({
			...this._def,
			maxLength: {
				value: t,
				message: j.toString(n)
			}
		});
	}
	length(t, n) {
		return new e({
			...this._def,
			exactLength: {
				value: t,
				message: j.toString(n)
			}
		});
	}
	nonempty(e) {
		return this.min(1, e);
	}
};
H.create = (e, t) => new H({
	type: e,
	minLength: null,
	maxLength: null,
	exactLength: null,
	typeName: Q.ZodArray,
	...N(t)
});
function U(e) {
	if (e instanceof W) {
		let t = {};
		for (let n in e.shape) {
			let r = e.shape[n];
			t[n] = X.create(U(r));
		}
		return new W({
			...e._def,
			shape: () => t
		});
	} else if (e instanceof H) return new H({
		...e._def,
		type: U(e.element)
	});
	else if (e instanceof X) return X.create(U(e.unwrap()));
	else if (e instanceof Z) return Z.create(U(e.unwrap()));
	else if (e instanceof q) return q.create(e.items.map((e) => U(e)));
	else return e;
}
var W = class e extends P {
	constructor() {
		super(...arguments), this._cached = null, this.nonstrict = this.passthrough, this.augment = this.extend;
	}
	_getCached() {
		if (this._cached !== null) return this._cached;
		let e = this._def.shape();
		return this._cached = {
			shape: e,
			keys: m.objectKeys(e)
		};
	}
	_parse(e) {
		if (this._getType(e) !== g.object) {
			let t = this._getOrReturnCtx(e);
			return E(t, {
				code: v.invalid_type,
				expected: g.object,
				received: t.parsedType
			}), O;
		}
		let { status: t, ctx: n } = this._processInputParams(e), { shape: r, keys: i } = this._getCached(), a = [];
		if (!(this._def.catchall instanceof V && this._def.unknownKeys === "strip")) for (let e in n.data) i.includes(e) || a.push(e);
		let o = [];
		for (let e of i) {
			let t = r[e], i = n.data[e];
			o.push({
				key: {
					status: "valid",
					value: e
				},
				value: t._parse(new M(n, i, n.path, e)),
				alwaysSet: e in n.data
			});
		}
		if (this._def.catchall instanceof V) {
			let e = this._def.unknownKeys;
			if (e === "passthrough") for (let e of a) o.push({
				key: {
					status: "valid",
					value: e
				},
				value: {
					status: "valid",
					value: n.data[e]
				}
			});
			else if (e === "strict") a.length > 0 && (E(n, {
				code: v.unrecognized_keys,
				keys: a
			}), t.dirty());
			else if (e !== "strip") throw Error("Internal ZodObject error: invalid unknownKeys value.");
		} else {
			let e = this._def.catchall;
			for (let t of a) {
				let r = n.data[t];
				o.push({
					key: {
						status: "valid",
						value: t
					},
					value: e._parse(new M(n, r, n.path, t)),
					alwaysSet: t in n.data
				});
			}
		}
		return n.common.async ? Promise.resolve().then(async () => {
			let e = [];
			for (let t of o) {
				let n = await t.key;
				e.push({
					key: n,
					value: await t.value,
					alwaysSet: t.alwaysSet
				});
			}
			return e;
		}).then((e) => D.mergeObjectSync(t, e)) : D.mergeObjectSync(t, o);
	}
	get shape() {
		return this._def.shape();
	}
	strict(t) {
		return j.errToObj, new e({
			...this._def,
			unknownKeys: "strict",
			...t === void 0 ? {} : { errorMap: (e, n) => {
				var r;
				let i = (r = this._def).errorMap?.call(r, e, n).message ?? n.defaultError;
				return e.code === "unrecognized_keys" ? { message: j.errToObj(t).message ?? i } : { message: i };
			} }
		});
	}
	strip() {
		return new e({
			...this._def,
			unknownKeys: "strip"
		});
	}
	passthrough() {
		return new e({
			...this._def,
			unknownKeys: "passthrough"
		});
	}
	extend(t) {
		return new e({
			...this._def,
			shape: () => ({
				...this._def.shape(),
				...t
			})
		});
	}
	merge(t) {
		return new e({
			unknownKeys: t._def.unknownKeys,
			catchall: t._def.catchall,
			shape: () => ({
				...this._def.shape(),
				...t._def.shape()
			}),
			typeName: Q.ZodObject
		});
	}
	setKey(e, t) {
		return this.augment({ [e]: t });
	}
	catchall(t) {
		return new e({
			...this._def,
			catchall: t
		});
	}
	pick(t) {
		let n = {};
		return m.objectKeys(t).forEach((e) => {
			t[e] && this.shape[e] && (n[e] = this.shape[e]);
		}), new e({
			...this._def,
			shape: () => n
		});
	}
	omit(t) {
		let n = {};
		return m.objectKeys(this.shape).forEach((e) => {
			t[e] || (n[e] = this.shape[e]);
		}), new e({
			...this._def,
			shape: () => n
		});
	}
	deepPartial() {
		return U(this);
	}
	partial(t) {
		let n = {};
		return m.objectKeys(this.shape).forEach((e) => {
			let r = this.shape[e];
			t && !t[e] ? n[e] = r : n[e] = r.optional();
		}), new e({
			...this._def,
			shape: () => n
		});
	}
	required(t) {
		let n = {};
		return m.objectKeys(this.shape).forEach((e) => {
			if (t && !t[e]) n[e] = this.shape[e];
			else {
				let t = this.shape[e];
				for (; t instanceof X;) t = t._def.innerType;
				n[e] = t;
			}
		}), new e({
			...this._def,
			shape: () => n
		});
	}
	keyof() {
		return je(m.objectKeys(this.shape));
	}
};
W.create = (e, t) => new W({
	shape: () => e,
	unknownKeys: "strip",
	catchall: V.create(),
	typeName: Q.ZodObject,
	...N(t)
}), W.strictCreate = (e, t) => new W({
	shape: () => e,
	unknownKeys: "strict",
	catchall: V.create(),
	typeName: Q.ZodObject,
	...N(t)
}), W.lazycreate = (e, t) => new W({
	shape: e,
	unknownKeys: "strip",
	catchall: V.create(),
	typeName: Q.ZodObject,
	...N(t)
});
var G = class extends P {
	_parse(e) {
		let { ctx: t } = this._processInputParams(e), n = this._def.options;
		function r(e) {
			for (let t of e) if (t.result.status === "valid") return t.result;
			for (let n of e) if (n.result.status === "dirty") return t.common.issues.push(...n.ctx.common.issues), n.result;
			let n = e.map((e) => new b(e.ctx.common.issues));
			return E(t, {
				code: v.invalid_union,
				unionErrors: n
			}), O;
		}
		if (t.common.async) return Promise.all(n.map(async (e) => {
			let n = {
				...t,
				common: {
					...t.common,
					issues: []
				},
				parent: null
			};
			return {
				result: await e._parseAsync({
					data: t.data,
					path: t.path,
					parent: n
				}),
				ctx: n
			};
		})).then(r);
		{
			let e, r = [];
			for (let i of n) {
				let n = {
					...t,
					common: {
						...t.common,
						issues: []
					},
					parent: null
				}, a = i._parseSync({
					data: t.data,
					path: t.path,
					parent: n
				});
				if (a.status === "valid") return a;
				a.status === "dirty" && !e && (e = {
					result: a,
					ctx: n
				}), n.common.issues.length && r.push(n.common.issues);
			}
			if (e) return t.common.issues.push(...e.ctx.common.issues), e.result;
			let i = r.map((e) => new b(e));
			return E(t, {
				code: v.invalid_union,
				unionErrors: i
			}), O;
		}
	}
	get options() {
		return this._def.options;
	}
};
G.create = (e, t) => new G({
	options: e,
	typeName: Q.ZodUnion,
	...N(t)
});
var Se = (e) => e instanceof ke ? Se(e.schema) : e instanceof Y ? Se(e.innerType()) : e instanceof Ae ? [e.value] : e instanceof Me ? e.options : e instanceof Ne ? Object.keys(e.enum) : e instanceof Pe ? Se(e._def.innerType) : e instanceof ye ? [void 0] : e instanceof be ? [null] : null, Ce = class e extends P {
	_parse(e) {
		let { ctx: t } = this._processInputParams(e);
		if (t.parsedType !== g.object) return E(t, {
			code: v.invalid_type,
			expected: g.object,
			received: t.parsedType
		}), O;
		let n = this.discriminator, r = t.data[n], i = this.optionsMap.get(r);
		return i ? t.common.async ? i._parseAsync({
			data: t.data,
			path: t.path,
			parent: t
		}) : i._parseSync({
			data: t.data,
			path: t.path,
			parent: t
		}) : (E(t, {
			code: v.invalid_union_discriminator,
			options: Array.from(this.optionsMap.keys()),
			path: [n]
		}), O);
	}
	get discriminator() {
		return this._def.discriminator;
	}
	get options() {
		return this._def.options;
	}
	get optionsMap() {
		return this._def.optionsMap;
	}
	static create(t, n, r) {
		let i = /* @__PURE__ */ new Map();
		for (let e of n) {
			let n = Se(e.shape[t]);
			if (!n) throw Error(`A discriminator value for key \`${t}\` could not be extracted from all schema options`);
			for (let r of n) {
				if (i.has(r)) throw Error(`Discriminator property ${String(t)} has duplicate value ${String(r)}`);
				i.set(r, e);
			}
		}
		return new e({
			typeName: Q.ZodDiscriminatedUnion,
			discriminator: t,
			options: n,
			optionsMap: i,
			...N(r)
		});
	}
};
function we(e, t) {
	let n = _(e), r = _(t);
	if (e === t) return {
		valid: !0,
		data: e
	};
	if (n === g.object && r === g.object) {
		let n = m.objectKeys(t), r = m.objectKeys(e).filter((e) => n.indexOf(e) !== -1), i = {
			...e,
			...t
		};
		for (let n of r) {
			let r = we(e[n], t[n]);
			if (!r.valid) return { valid: !1 };
			i[n] = r.data;
		}
		return {
			valid: !0,
			data: i
		};
	} else if (n === g.array && r === g.array) {
		if (e.length !== t.length) return { valid: !1 };
		let n = [];
		for (let r = 0; r < e.length; r++) {
			let i = e[r], a = t[r], o = we(i, a);
			if (!o.valid) return { valid: !1 };
			n.push(o.data);
		}
		return {
			valid: !0,
			data: n
		};
	} else if (n === g.date && r === g.date && +e == +t) return {
		valid: !0,
		data: e
	};
	else return { valid: !1 };
}
var K = class extends P {
	_parse(e) {
		let { status: t, ctx: n } = this._processInputParams(e), r = (e, r) => {
			if (ne(e) || ne(r)) return O;
			let i = we(e.value, r.value);
			return i.valid ? ((re(e) || re(r)) && t.dirty(), {
				status: t.value,
				value: i.data
			}) : (E(n, { code: v.invalid_intersection_types }), O);
		};
		return n.common.async ? Promise.all([this._def.left._parseAsync({
			data: n.data,
			path: n.path,
			parent: n
		}), this._def.right._parseAsync({
			data: n.data,
			path: n.path,
			parent: n
		})]).then(([e, t]) => r(e, t)) : r(this._def.left._parseSync({
			data: n.data,
			path: n.path,
			parent: n
		}), this._def.right._parseSync({
			data: n.data,
			path: n.path,
			parent: n
		}));
	}
};
K.create = (e, t, n) => new K({
	left: e,
	right: t,
	typeName: Q.ZodIntersection,
	...N(n)
});
var q = class e extends P {
	_parse(e) {
		let { status: t, ctx: n } = this._processInputParams(e);
		if (n.parsedType !== g.array) return E(n, {
			code: v.invalid_type,
			expected: g.array,
			received: n.parsedType
		}), O;
		if (n.data.length < this._def.items.length) return E(n, {
			code: v.too_small,
			minimum: this._def.items.length,
			inclusive: !0,
			exact: !1,
			type: "array"
		}), O;
		!this._def.rest && n.data.length > this._def.items.length && (E(n, {
			code: v.too_big,
			maximum: this._def.items.length,
			inclusive: !0,
			exact: !1,
			type: "array"
		}), t.dirty());
		let r = [...n.data].map((e, t) => {
			let r = this._def.items[t] || this._def.rest;
			return r ? r._parse(new M(n, e, n.path, t)) : null;
		}).filter((e) => !!e);
		return n.common.async ? Promise.all(r).then((e) => D.mergeArray(t, e)) : D.mergeArray(t, r);
	}
	get items() {
		return this._def.items;
	}
	rest(t) {
		return new e({
			...this._def,
			rest: t
		});
	}
};
q.create = (e, t) => {
	if (!Array.isArray(e)) throw Error("You must pass an array of schemas to z.tuple([ ... ])");
	return new q({
		items: e,
		typeName: Q.ZodTuple,
		rest: null,
		...N(t)
	});
};
var Te = class e extends P {
	get keySchema() {
		return this._def.keyType;
	}
	get valueSchema() {
		return this._def.valueType;
	}
	_parse(e) {
		let { status: t, ctx: n } = this._processInputParams(e);
		if (n.parsedType !== g.object) return E(n, {
			code: v.invalid_type,
			expected: g.object,
			received: n.parsedType
		}), O;
		let r = [], i = this._def.keyType, a = this._def.valueType;
		for (let e in n.data) r.push({
			key: i._parse(new M(n, e, n.path, e)),
			value: a._parse(new M(n, n.data[e], n.path, e))
		});
		return n.common.async ? D.mergeObjectAsync(t, r) : D.mergeObjectSync(t, r);
	}
	get element() {
		return this._def.valueType;
	}
	static create(t, n, r) {
		return n instanceof P ? new e({
			keyType: t,
			valueType: n,
			typeName: Q.ZodRecord,
			...N(r)
		}) : new e({
			keyType: F.create(),
			valueType: t,
			typeName: Q.ZodRecord,
			...N(n)
		});
	}
}, Ee = class extends P {
	get keySchema() {
		return this._def.keyType;
	}
	get valueSchema() {
		return this._def.valueType;
	}
	_parse(e) {
		let { status: t, ctx: n } = this._processInputParams(e);
		if (n.parsedType !== g.map) return E(n, {
			code: v.invalid_type,
			expected: g.map,
			received: n.parsedType
		}), O;
		let r = this._def.keyType, i = this._def.valueType, a = [...n.data.entries()].map(([e, t], a) => ({
			key: r._parse(new M(n, e, n.path, [a, "key"])),
			value: i._parse(new M(n, t, n.path, [a, "value"]))
		}));
		if (n.common.async) {
			let e = /* @__PURE__ */ new Map();
			return Promise.resolve().then(async () => {
				for (let n of a) {
					let r = await n.key, i = await n.value;
					if (r.status === "aborted" || i.status === "aborted") return O;
					(r.status === "dirty" || i.status === "dirty") && t.dirty(), e.set(r.value, i.value);
				}
				return {
					status: t.value,
					value: e
				};
			});
		} else {
			let e = /* @__PURE__ */ new Map();
			for (let n of a) {
				let r = n.key, i = n.value;
				if (r.status === "aborted" || i.status === "aborted") return O;
				(r.status === "dirty" || i.status === "dirty") && t.dirty(), e.set(r.value, i.value);
			}
			return {
				status: t.value,
				value: e
			};
		}
	}
};
Ee.create = (e, t, n) => new Ee({
	valueType: t,
	keyType: e,
	typeName: Q.ZodMap,
	...N(n)
});
var De = class e extends P {
	_parse(e) {
		let { status: t, ctx: n } = this._processInputParams(e);
		if (n.parsedType !== g.set) return E(n, {
			code: v.invalid_type,
			expected: g.set,
			received: n.parsedType
		}), O;
		let r = this._def;
		r.minSize !== null && n.data.size < r.minSize.value && (E(n, {
			code: v.too_small,
			minimum: r.minSize.value,
			type: "set",
			inclusive: !0,
			exact: !1,
			message: r.minSize.message
		}), t.dirty()), r.maxSize !== null && n.data.size > r.maxSize.value && (E(n, {
			code: v.too_big,
			maximum: r.maxSize.value,
			type: "set",
			inclusive: !0,
			exact: !1,
			message: r.maxSize.message
		}), t.dirty());
		let i = this._def.valueType;
		function a(e) {
			let n = /* @__PURE__ */ new Set();
			for (let r of e) {
				if (r.status === "aborted") return O;
				r.status === "dirty" && t.dirty(), n.add(r.value);
			}
			return {
				status: t.value,
				value: n
			};
		}
		let o = [...n.data.values()].map((e, t) => i._parse(new M(n, e, n.path, t)));
		return n.common.async ? Promise.all(o).then((e) => a(e)) : a(o);
	}
	min(t, n) {
		return new e({
			...this._def,
			minSize: {
				value: t,
				message: j.toString(n)
			}
		});
	}
	max(t, n) {
		return new e({
			...this._def,
			maxSize: {
				value: t,
				message: j.toString(n)
			}
		});
	}
	size(e, t) {
		return this.min(e, t).max(e, t);
	}
	nonempty(e) {
		return this.min(1, e);
	}
};
De.create = (e, t) => new De({
	valueType: e,
	minSize: null,
	maxSize: null,
	typeName: Q.ZodSet,
	...N(t)
});
var Oe = class e extends P {
	constructor() {
		super(...arguments), this.validate = this.implement;
	}
	_parse(e) {
		let { ctx: t } = this._processInputParams(e);
		if (t.parsedType !== g.function) return E(t, {
			code: v.invalid_type,
			expected: g.function,
			received: t.parsedType
		}), O;
		function n(e, n) {
			return T({
				data: e,
				path: t.path,
				errorMaps: [
					t.common.contextualErrorMap,
					t.schemaErrorMap,
					w(),
					x
				].filter((e) => !!e),
				issueData: {
					code: v.invalid_arguments,
					argumentsError: n
				}
			});
		}
		function r(e, n) {
			return T({
				data: e,
				path: t.path,
				errorMaps: [
					t.common.contextualErrorMap,
					t.schemaErrorMap,
					w(),
					x
				].filter((e) => !!e),
				issueData: {
					code: v.invalid_return_type,
					returnTypeError: n
				}
			});
		}
		let i = { errorMap: t.common.contextualErrorMap }, a = t.data;
		if (this._def.returns instanceof J) {
			let e = this;
			return k(async function(...t) {
				let o = new b([]), s = await e._def.args.parseAsync(t, i).catch((e) => {
					throw o.addIssue(n(t, e)), o;
				}), c = await Reflect.apply(a, this, s);
				return await e._def.returns._def.type.parseAsync(c, i).catch((e) => {
					throw o.addIssue(r(c, e)), o;
				});
			});
		} else {
			let e = this;
			return k(function(...t) {
				let o = e._def.args.safeParse(t, i);
				if (!o.success) throw new b([n(t, o.error)]);
				let s = Reflect.apply(a, this, o.data), c = e._def.returns.safeParse(s, i);
				if (!c.success) throw new b([r(s, c.error)]);
				return c.data;
			});
		}
	}
	parameters() {
		return this._def.args;
	}
	returnType() {
		return this._def.returns;
	}
	args(...t) {
		return new e({
			...this._def,
			args: q.create(t).rest(B.create())
		});
	}
	returns(t) {
		return new e({
			...this._def,
			returns: t
		});
	}
	implement(e) {
		return this.parse(e);
	}
	strictImplement(e) {
		return this.parse(e);
	}
	static create(t, n, r) {
		return new e({
			args: t || q.create([]).rest(B.create()),
			returns: n || B.create(),
			typeName: Q.ZodFunction,
			...N(r)
		});
	}
}, ke = class extends P {
	get schema() {
		return this._def.getter();
	}
	_parse(e) {
		let { ctx: t } = this._processInputParams(e);
		return this._def.getter()._parse({
			data: t.data,
			path: t.path,
			parent: t
		});
	}
};
ke.create = (e, t) => new ke({
	getter: e,
	typeName: Q.ZodLazy,
	...N(t)
});
var Ae = class extends P {
	_parse(e) {
		if (e.data !== this._def.value) {
			let t = this._getOrReturnCtx(e);
			return E(t, {
				received: t.data,
				code: v.invalid_literal,
				expected: this._def.value
			}), O;
		}
		return {
			status: "valid",
			value: e.data
		};
	}
	get value() {
		return this._def.value;
	}
};
Ae.create = (e, t) => new Ae({
	value: e,
	typeName: Q.ZodLiteral,
	...N(t)
});
function je(e, t) {
	return new Me({
		values: e,
		typeName: Q.ZodEnum,
		...N(t)
	});
}
var Me = class e extends P {
	_parse(e) {
		if (typeof e.data != "string") {
			let t = this._getOrReturnCtx(e), n = this._def.values;
			return E(t, {
				expected: m.joinValues(n),
				received: t.parsedType,
				code: v.invalid_type
			}), O;
		}
		if (this._def.values.indexOf(e.data) === -1) {
			let t = this._getOrReturnCtx(e), n = this._def.values;
			return E(t, {
				received: t.data,
				code: v.invalid_enum_value,
				options: n
			}), O;
		}
		return k(e.data);
	}
	get options() {
		return this._def.values;
	}
	get enum() {
		let e = {};
		for (let t of this._def.values) e[t] = t;
		return e;
	}
	get Values() {
		let e = {};
		for (let t of this._def.values) e[t] = t;
		return e;
	}
	get Enum() {
		let e = {};
		for (let t of this._def.values) e[t] = t;
		return e;
	}
	extract(t) {
		return e.create(t);
	}
	exclude(t) {
		return e.create(this.options.filter((e) => !t.includes(e)));
	}
};
Me.create = je;
var Ne = class extends P {
	_parse(e) {
		let t = m.getValidEnumValues(this._def.values), n = this._getOrReturnCtx(e);
		if (n.parsedType !== g.string && n.parsedType !== g.number) {
			let e = m.objectValues(t);
			return E(n, {
				expected: m.joinValues(e),
				received: n.parsedType,
				code: v.invalid_type
			}), O;
		}
		if (t.indexOf(e.data) === -1) {
			let e = m.objectValues(t);
			return E(n, {
				received: n.data,
				code: v.invalid_enum_value,
				options: e
			}), O;
		}
		return k(e.data);
	}
	get enum() {
		return this._def.values;
	}
};
Ne.create = (e, t) => new Ne({
	values: e,
	typeName: Q.ZodNativeEnum,
	...N(t)
});
var J = class extends P {
	unwrap() {
		return this._def.type;
	}
	_parse(e) {
		let { ctx: t } = this._processInputParams(e);
		return t.parsedType !== g.promise && t.common.async === !1 ? (E(t, {
			code: v.invalid_type,
			expected: g.promise,
			received: t.parsedType
		}), O) : k((t.parsedType === g.promise ? t.data : Promise.resolve(t.data)).then((e) => this._def.type.parseAsync(e, {
			path: t.path,
			errorMap: t.common.contextualErrorMap
		})));
	}
};
J.create = (e, t) => new J({
	type: e,
	typeName: Q.ZodPromise,
	...N(t)
});
var Y = class extends P {
	innerType() {
		return this._def.schema;
	}
	sourceType() {
		return this._def.schema._def.typeName === Q.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
	}
	_parse(e) {
		let { status: t, ctx: n } = this._processInputParams(e), r = this._def.effect || null, i = {
			addIssue: (e) => {
				E(n, e), e.fatal ? t.abort() : t.dirty();
			},
			get path() {
				return n.path;
			}
		};
		if (i.addIssue = i.addIssue.bind(i), r.type === "preprocess") {
			let e = r.transform(n.data, i);
			return n.common.issues.length ? {
				status: "dirty",
				value: n.data
			} : n.common.async ? Promise.resolve(e).then((e) => this._def.schema._parseAsync({
				data: e,
				path: n.path,
				parent: n
			})) : this._def.schema._parseSync({
				data: e,
				path: n.path,
				parent: n
			});
		}
		if (r.type === "refinement") {
			let e = (e) => {
				let t = r.refinement(e, i);
				if (n.common.async) return Promise.resolve(t);
				if (t instanceof Promise) throw Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
				return e;
			};
			if (n.common.async === !1) {
				let r = this._def.schema._parseSync({
					data: n.data,
					path: n.path,
					parent: n
				});
				return r.status === "aborted" ? O : (r.status === "dirty" && t.dirty(), e(r.value), {
					status: t.value,
					value: r.value
				});
			} else return this._def.schema._parseAsync({
				data: n.data,
				path: n.path,
				parent: n
			}).then((n) => n.status === "aborted" ? O : (n.status === "dirty" && t.dirty(), e(n.value).then(() => ({
				status: t.value,
				value: n.value
			}))));
		}
		if (r.type === "transform") if (n.common.async === !1) {
			let e = this._def.schema._parseSync({
				data: n.data,
				path: n.path,
				parent: n
			});
			if (!A(e)) return e;
			let a = r.transform(e.value, i);
			if (a instanceof Promise) throw Error("Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.");
			return {
				status: t.value,
				value: a
			};
		} else return this._def.schema._parseAsync({
			data: n.data,
			path: n.path,
			parent: n
		}).then((e) => A(e) ? Promise.resolve(r.transform(e.value, i)).then((e) => ({
			status: t.value,
			value: e
		})) : e);
		m.assertNever(r);
	}
};
Y.create = (e, t, n) => new Y({
	schema: e,
	typeName: Q.ZodEffects,
	effect: t,
	...N(n)
}), Y.createWithPreprocess = (e, t, n) => new Y({
	schema: t,
	effect: {
		type: "preprocess",
		transform: e
	},
	typeName: Q.ZodEffects,
	...N(n)
});
var X = class extends P {
	_parse(e) {
		return this._getType(e) === g.undefined ? k(void 0) : this._def.innerType._parse(e);
	}
	unwrap() {
		return this._def.innerType;
	}
};
X.create = (e, t) => new X({
	innerType: e,
	typeName: Q.ZodOptional,
	...N(t)
});
var Z = class extends P {
	_parse(e) {
		return this._getType(e) === g.null ? k(null) : this._def.innerType._parse(e);
	}
	unwrap() {
		return this._def.innerType;
	}
};
Z.create = (e, t) => new Z({
	innerType: e,
	typeName: Q.ZodNullable,
	...N(t)
});
var Pe = class extends P {
	_parse(e) {
		let { ctx: t } = this._processInputParams(e), n = t.data;
		return t.parsedType === g.undefined && (n = this._def.defaultValue()), this._def.innerType._parse({
			data: n,
			path: t.path,
			parent: t
		});
	}
	removeDefault() {
		return this._def.innerType;
	}
};
Pe.create = (e, t) => new Pe({
	innerType: e,
	typeName: Q.ZodDefault,
	defaultValue: typeof t.default == "function" ? t.default : () => t.default,
	...N(t)
});
var Fe = class extends P {
	_parse(e) {
		let { ctx: t } = this._processInputParams(e), n = {
			...t,
			common: {
				...t.common,
				issues: []
			}
		}, r = this._def.innerType._parse({
			data: n.data,
			path: n.path,
			parent: { ...n }
		});
		return ie(r) ? r.then((e) => ({
			status: "valid",
			value: e.status === "valid" ? e.value : this._def.catchValue({
				get error() {
					return new b(n.common.issues);
				},
				input: n.data
			})
		})) : {
			status: "valid",
			value: r.status === "valid" ? r.value : this._def.catchValue({
				get error() {
					return new b(n.common.issues);
				},
				input: n.data
			})
		};
	}
	removeCatch() {
		return this._def.innerType;
	}
};
Fe.create = (e, t) => new Fe({
	innerType: e,
	typeName: Q.ZodCatch,
	catchValue: typeof t.catch == "function" ? t.catch : () => t.catch,
	...N(t)
});
var Ie = class extends P {
	_parse(e) {
		if (this._getType(e) !== g.nan) {
			let t = this._getOrReturnCtx(e);
			return E(t, {
				code: v.invalid_type,
				expected: g.nan,
				received: t.parsedType
			}), O;
		}
		return {
			status: "valid",
			value: e.data
		};
	}
};
Ie.create = (e) => new Ie({
	typeName: Q.ZodNaN,
	...N(e)
});
var Le = Symbol("zod_brand"), Re = class extends P {
	_parse(e) {
		let { ctx: t } = this._processInputParams(e), n = t.data;
		return this._def.type._parse({
			data: n,
			path: t.path,
			parent: t
		});
	}
	unwrap() {
		return this._def.type;
	}
}, ze = class e extends P {
	_parse(e) {
		let { status: t, ctx: n } = this._processInputParams(e);
		if (n.common.async) return (async () => {
			let e = await this._def.in._parseAsync({
				data: n.data,
				path: n.path,
				parent: n
			});
			return e.status === "aborted" ? O : e.status === "dirty" ? (t.dirty(), te(e.value)) : this._def.out._parseAsync({
				data: e.value,
				path: n.path,
				parent: n
			});
		})();
		{
			let e = this._def.in._parseSync({
				data: n.data,
				path: n.path,
				parent: n
			});
			return e.status === "aborted" ? O : e.status === "dirty" ? (t.dirty(), {
				status: "dirty",
				value: e.value
			}) : this._def.out._parseSync({
				data: e.value,
				path: n.path,
				parent: n
			});
		}
	}
	static create(t, n) {
		return new e({
			in: t,
			out: n,
			typeName: Q.ZodPipeline
		});
	}
}, Be = class extends P {
	_parse(e) {
		let t = this._def.innerType._parse(e);
		return A(t) && (t.value = Object.freeze(t.value)), t;
	}
};
Be.create = (e, t) => new Be({
	innerType: e,
	typeName: Q.ZodReadonly,
	...N(t)
});
var Ve = (e, t = {}, n) => e ? z.create().superRefine((r, i) => {
	if (!e(r)) {
		let e = typeof t == "function" ? t(r) : typeof t == "string" ? { message: t } : t, a = e.fatal ?? n ?? !0, o = typeof e == "string" ? { message: e } : e;
		i.addIssue({
			code: "custom",
			...o,
			fatal: a
		});
	}
}) : z.create(), He = { object: W.lazycreate }, Q;
(function(e) {
	e.ZodString = "ZodString", e.ZodNumber = "ZodNumber", e.ZodNaN = "ZodNaN", e.ZodBigInt = "ZodBigInt", e.ZodBoolean = "ZodBoolean", e.ZodDate = "ZodDate", e.ZodSymbol = "ZodSymbol", e.ZodUndefined = "ZodUndefined", e.ZodNull = "ZodNull", e.ZodAny = "ZodAny", e.ZodUnknown = "ZodUnknown", e.ZodNever = "ZodNever", e.ZodVoid = "ZodVoid", e.ZodArray = "ZodArray", e.ZodObject = "ZodObject", e.ZodUnion = "ZodUnion", e.ZodDiscriminatedUnion = "ZodDiscriminatedUnion", e.ZodIntersection = "ZodIntersection", e.ZodTuple = "ZodTuple", e.ZodRecord = "ZodRecord", e.ZodMap = "ZodMap", e.ZodSet = "ZodSet", e.ZodFunction = "ZodFunction", e.ZodLazy = "ZodLazy", e.ZodLiteral = "ZodLiteral", e.ZodEnum = "ZodEnum", e.ZodEffects = "ZodEffects", e.ZodNativeEnum = "ZodNativeEnum", e.ZodOptional = "ZodOptional", e.ZodNullable = "ZodNullable", e.ZodDefault = "ZodDefault", e.ZodCatch = "ZodCatch", e.ZodPromise = "ZodPromise", e.ZodBranded = "ZodBranded", e.ZodPipeline = "ZodPipeline", e.ZodReadonly = "ZodReadonly";
})(Q ||= {});
var Ue = (e, t = { message: `Input not instance of ${e.name}` }) => Ve((t) => t instanceof e, t), We = F.create, Ge = _e.create, Ke = Ie.create, qe = I.create, Je = L.create, Ye = R.create, Xe = ve.create, Ze = ye.create, Qe = be.create, $e = z.create, et = B.create, tt = V.create, nt = xe.create, rt = H.create, it = W.create, at = W.strictCreate, ot = G.create, st = Ce.create, ct = K.create, lt = q.create, ut = Te.create, dt = Ee.create, ft = De.create, pt = Oe.create, mt = ke.create, ht = Ae.create, gt = Me.create, _t = Ne.create, vt = J.create, yt = Y.create, bt = X.create, xt = Z.create, St = Y.createWithPreprocess, Ct = ze.create, wt = () => We().optional(), Tt = () => Ge().optional(), Et = () => Je().optional(), Dt = {
	string: ((e) => F.create({
		...e,
		coerce: !0
	})),
	number: ((e) => _e.create({
		...e,
		coerce: !0
	})),
	boolean: ((e) => L.create({
		...e,
		coerce: !0
	})),
	bigint: ((e) => I.create({
		...e,
		coerce: !0
	})),
	date: ((e) => R.create({
		...e,
		coerce: !0
	}))
}, Ot = O, kt = /* @__PURE__ */ Object.freeze({
	__proto__: null,
	defaultErrorMap: x,
	setErrorMap: C,
	getErrorMap: w,
	makeIssue: T,
	EMPTY_PATH: ee,
	addIssueToContext: E,
	ParseStatus: D,
	INVALID: O,
	DIRTY: te,
	OK: k,
	isAborted: ne,
	isDirty: re,
	isValid: A,
	isAsync: ie,
	get util() {
		return m;
	},
	get objectUtil() {
		return h;
	},
	ZodParsedType: g,
	getParsedType: _,
	ZodType: P,
	ZodString: F,
	ZodNumber: _e,
	ZodBigInt: I,
	ZodBoolean: L,
	ZodDate: R,
	ZodSymbol: ve,
	ZodUndefined: ye,
	ZodNull: be,
	ZodAny: z,
	ZodUnknown: B,
	ZodNever: V,
	ZodVoid: xe,
	ZodArray: H,
	ZodObject: W,
	ZodUnion: G,
	ZodDiscriminatedUnion: Ce,
	ZodIntersection: K,
	ZodTuple: q,
	ZodRecord: Te,
	ZodMap: Ee,
	ZodSet: De,
	ZodFunction: Oe,
	ZodLazy: ke,
	ZodLiteral: Ae,
	ZodEnum: Me,
	ZodNativeEnum: Ne,
	ZodPromise: J,
	ZodEffects: Y,
	ZodTransformer: Y,
	ZodOptional: X,
	ZodNullable: Z,
	ZodDefault: Pe,
	ZodCatch: Fe,
	ZodNaN: Ie,
	BRAND: Le,
	ZodBranded: Re,
	ZodPipeline: ze,
	ZodReadonly: Be,
	custom: Ve,
	Schema: P,
	ZodSchema: P,
	late: He,
	get ZodFirstPartyTypeKind() {
		return Q;
	},
	coerce: Dt,
	any: $e,
	array: rt,
	bigint: qe,
	boolean: Je,
	date: Ye,
	discriminatedUnion: st,
	effect: yt,
	enum: gt,
	function: pt,
	instanceof: Ue,
	intersection: ct,
	lazy: mt,
	literal: ht,
	map: dt,
	nan: Ke,
	nativeEnum: _t,
	never: tt,
	null: Qe,
	nullable: xt,
	number: Ge,
	object: it,
	oboolean: Et,
	onumber: Tt,
	optional: bt,
	ostring: wt,
	pipeline: Ct,
	preprocess: St,
	promise: vt,
	record: ut,
	set: ft,
	strictObject: at,
	string: We,
	symbol: Xe,
	transformer: yt,
	tuple: lt,
	undefined: Ze,
	union: ot,
	unknown: et,
	void: nt,
	NEVER: Ot,
	ZodIssueCode: v,
	quotelessJson: y,
	ZodError: b
}), At = /* @__PURE__ */ p(((e) => {
	var t = Symbol.for("react.transitional.element"), n = Symbol.for("react.fragment");
	function r(e, n, r) {
		var i = null;
		if (r !== void 0 && (i = "" + r), n.key !== void 0 && (i = "" + n.key), "key" in n) for (var a in r = {}, n) a !== "key" && (r[a] = n[a]);
		else r = n;
		return n = r.ref, {
			$$typeof: t,
			type: e,
			key: i,
			ref: n === void 0 ? null : n,
			props: r
		};
	}
	e.Fragment = n, e.jsx = r, e.jsxs = r;
})), $ = (/* @__PURE__ */ p(((e, t) => {
	t.exports = At();
})))(), jt = ({ src: t, clip_url: n, style: r = {}, startFrom: a = 0, trim_in: c, trim_out: l, mediaType: p, media_type: m, animation: h = "none", duration: g = 3, playbackRate: _, speed: v }) => {
	let y = d(), { fps: b } = f(), x = t || n || "", S = p || m, C = c ?? a, w = l, T = v ?? _ ?? 1, ee = e(() => {
		if (S === "image" || S === "generated") return "image";
		if (S === "video") return "video";
		let e = [
			".jpg",
			".jpeg",
			".png",
			".gif",
			".bmp",
			".webp",
			".svg"
		], t = [
			".mp4",
			".mov",
			".avi",
			".mkv",
			".webm",
			".m4v"
		], n = x.toLowerCase();
		return e.some((e) => n.includes(e)) ? "image" : t.some((e) => n.includes(e)) ? "video" : n.includes("picsum.photos") || n.includes("unsplash.com") || n.includes("images.unsplash.com") || n.includes("via.placeholder.com") || n.includes("placeholder.com") ? "image" : "video";
	}, [x, S]), E = e(() => x.startsWith("http") ? x : u(x), [x]), D = e(() => {
		if (h === "none") return 1;
		let e = g * b, t = ((e) => e < .5 ? 4 * e * e * e : 1 - (-2 * e + 2) ** 3 / 2)(Math.min(y / e, 1));
		return h === "zoom-in" ? 1 + .3 * t : h === "zoom-out" ? 1.3 - .3 * t : 1;
	}, [
		y,
		b,
		g,
		h
	]), O = e(() => h === "none" ? "" : `scale(${D})`, [D, h]), te = {
		width: "100%",
		height: "100%",
		objectFit: "cover",
		willChange: "transform",
		transform: O,
		backfaceVisibility: "hidden",
		imageRendering: "auto",
		WebkitBackfaceVisibility: "hidden",
		WebkitTransform: O,
		overflow: "hidden",
		WebkitFontSmoothing: "antialiased",
		MozOsxFontSmoothing: "grayscale",
		transformOrigin: "center center",
		...r
	};
	return ee === "image" ? /* @__PURE__ */ (0, $.jsx)(i, {
		style: {
			overflow: "hidden",
			transformOrigin: "center center"
		},
		children: /* @__PURE__ */ (0, $.jsx)(o, {
			src: E,
			style: {
				...te,
				imageRendering: "auto"
			}
		})
	}) : /* @__PURE__ */ (0, $.jsx)(i, {
		style: {
			overflow: "hidden",
			transformOrigin: "center center"
		},
		children: /* @__PURE__ */ (0, $.jsx)(s, {
			src: E,
			startFrom: C,
			endAt: w,
			playbackRate: T,
			muted: !0,
			volume: 0,
			style: {
				...te,
				imageRendering: "auto"
			}
		})
	});
};
//#endregion
//#region remotion/utils/legacyAdapter.ts
function Mt(e) {
	switch (e) {
		case "9:16": return {
			width: 1080,
			height: 1920
		};
		case "1:1": return {
			width: 1080,
			height: 1080
		};
		case "16:9": return {
			width: 1920,
			height: 1080
		};
		default: return {
			width: 1080,
			height: 1920
		};
	}
}
function Nt(e) {
	switch (e) {
		case "fade":
		case "zoom-in":
		case "zoom-out":
		case "slide-left":
		case "slide-right":
		case "slide-up":
		case "slide-down":
		case "none": return e;
		default: return "none";
	}
}
function Pt(e) {
	let { width: t, height: n } = Mt(e.aspectRatio), r = Nt(e.transition ?? e.transitionType), i = 0, a = (e.clips || []).map((t, n) => {
		let a = (e.clipDurations || [])[n] ?? 3, o = Math.round(a * 30), s = i, c = i + o;
		i = c;
		let l = n < (e.clips?.length ?? 0) - 1, u = (e.animations || [])[n] ?? "none", d = (e.mediaTypes || [])[n] ?? "video";
		return {
			id: `clip_${n}`,
			clip_url: t,
			media_type: d === "image" ? "image" : "video",
			start_frame: s,
			end_frame: c,
			trim_in: 0,
			trim_out: o,
			animation: u === "zoom-in" || u === "zoom-out" ? u : "none",
			transition_out: l && r !== "none" ? {
				type: r,
				duration_frames: 15
			} : null,
			speed: 1,
			color_grade: null,
			volume: 0
		};
	}), o = (e.subtitles || []).map((t, n) => ({
		id: `sub_${n}`,
		text: t.text,
		start_frame: Math.round(t.start * 30),
		end_frame: Math.round(t.end * 30),
		style: t.style || e.subtitleStyle || "default",
		position: t.position || "bottom",
		config: {
			backgroundColor: t.backgroundColor,
			color: t.textColor
		},
		words: t.words?.map((e) => ({
			word: e.word,
			start_frame: Math.round(e.start * 30),
			end_frame: Math.round(e.end * 30)
		}))
	})), s = (e.overlays || []).map((e, t) => ({
		id: `overlay_${t}`,
		src: e.src,
		start_frame: Math.round(e.start * 30),
		end_frame: Math.round(e.end * 30),
		position: e.position || "top-right",
		width: e.width ?? 120,
		opacity: e.opacity ?? 1,
		animation: e.animation === "fade" ? "fade" : "none"
	})), c = o.length > 0 ? Math.max(...o.map((e) => e.end_frame)) : 0, l = Math.max(i, c), u = [];
	return e.voiceOver && u.push({
		id: "voiceover",
		url: e.voiceOver,
		type: "voiceover",
		start_frame: 0,
		end_frame: l,
		volume: e.voiceOverVolume ?? 1,
		fade_in_frames: 0,
		fade_out_frames: 10
	}), e.music && u.push({
		id: "music",
		url: e.music,
		type: "music",
		start_frame: 0,
		end_frame: l,
		volume: e.musicVolume ?? .3,
		fade_in_frames: 15,
		fade_out_frames: 15
	}), {
		version: 1,
		project_id: e.projectId ?? "unknown",
		fps: 30,
		total_frames: l,
		width: t,
		height: n,
		tracks: {
			video: a,
			subtitles: o,
			overlays: s,
			motion_graphics: [],
			audio: u
		},
		metadata: {
			platform: null,
			language: e.language ?? "en",
			created_at: (/* @__PURE__ */ new Date()).toISOString(),
			last_modified: (/* @__PURE__ */ new Date()).toISOString()
		}
	};
}
//#endregion
//#region remotion/subtitles/ProgressiveHighlightSubtitle.tsx
var Ft = ({ text: t, backgroundColor: n = "#007acc", position: r = "bottom", style: i = {}, fontFamily: a, startFrame: o, endFrame: s }) => {
	let c = d(), { words: l, totalWords: u, totalDuration: f, hasArabic: p, finalFontFamily: m } = e(() => {
		let e = t.trim().split(/\s+/), n = e.length, r = s - o, i = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(t);
		return {
			words: e,
			totalWords: n,
			totalDuration: r,
			hasArabic: i,
			finalFontFamily: a || (i ? "Cairo, 'Noto Sans Arabic', 'Arabic Typesetting', Arial, sans-serif" : "Roboto, 'Segoe UI', Arial, sans-serif")
		};
	}, [
		t,
		s,
		o,
		a
	]), h = Math.max(0, c - o), g = Math.max(0, Math.min(1, h / f)), _ = Math.min(Math.floor(g * u), u - 1), v = {
		position: "absolute",
		left: 0,
		right: 0,
		display: "flex",
		flexWrap: "wrap",
		justifyContent: "center",
		alignItems: "center",
		gap: 0,
		padding: "0 40px",
		pointerEvents: "none",
		zIndex: 1e3,
		willChange: "transform",
		transform: "translateZ(0)",
		backfaceVisibility: "hidden",
		...(() => {
			switch (r) {
				case "top": return { top: 120 };
				case "center": return {
					top: "50%",
					transform: "translateY(-50%)"
				};
				default: return { bottom: 120 };
			}
		})(),
		...i
	};
	return /* @__PURE__ */ (0, $.jsx)("div", {
		style: v,
		children: l.map((e, t) => {
			let r = t === _;
			return /* @__PURE__ */ (0, $.jsx)("span", {
				style: {
					fontFamily: m,
					fontSize: 48,
					fontWeight: 700,
					color: "#ffffff",
					padding: "4px 6px",
					margin: "0 0.5px",
					borderRadius: 1,
					backgroundColor: r ? n : "transparent",
					textTransform: "none",
					letterSpacing: 0,
					lineHeight: 1.2,
					textShadow: "-2px -2px 0 rgba(0, 0, 0, 0.8), 2px -2px 0 rgba(0, 0, 0, 0.8), -2px 2px 0 rgba(0, 0, 0, 0.8), 2px 2px 0 rgba(0, 0, 0, 0.8), 0px -2px 0 rgba(0, 0, 0, 0.8), 0px 2px 0 rgba(0, 0, 0, 0.8), -2px 0px 0 rgba(0, 0, 0, 0.8), 2px 0px 0 rgba(0, 0, 0, 0.8), -1px -1px 0 rgba(0, 0, 0, 0.8), 1px -1px 0 rgba(0, 0, 0, 0.8), -1px 1px 0 rgba(0, 0, 0, 0.8), 1px 1px 0 rgba(0, 0, 0, 0.8), 3px 3px 4px rgba(0, 0, 0, 0.5)",
					boxShadow: r ? "0 2px 8px rgba(0,0,0,0.4)" : "none",
					display: "inline-block",
					direction: p ? "rtl" : "ltr",
					willChange: "background-color",
					transform: "translateZ(0)",
					backfaceVisibility: "hidden"
				},
				children: e
			}, t);
		})
	});
}, It = ({ text: e, backgroundColor: t, position: n = "bottom", style: r = {}, animationFrame: i = 0, fontFamily: a }) => {
	let o = e.replace(/\\n/g, "\n"), [s, c] = o.split("\n").length > 1 ? o.split("\n") : [o, ""], l = {
		transform: `scale(${.8 + .2 * Math.min(i / 10, 1)})`,
		opacity: Math.min(i / 10, 1),
		transition: "all 0.4s cubic-bezier(.5,1.8,.5,1)"
	}, u = {
		position: "absolute",
		left: 0,
		right: 0,
		[n]: 60,
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		pointerEvents: "none",
		zIndex: 1e3,
		...r,
		...l
	}, d = a || "Roboto, 'Segoe UI', Arial, sans-serif";
	return /* @__PURE__ */ (0, $.jsxs)("div", {
		style: u,
		children: [/* @__PURE__ */ (0, $.jsx)("span", {
			style: {
				fontFamily: d,
				fontWeight: 700,
				fontSize: 48,
				color: "#fff",
				textTransform: "uppercase",
				textShadow: "1px 1px 2px rgba(0, 0, 0, 0.8)",
				letterSpacing: 0,
				lineHeight: 1.2,
				marginBottom: c ? 6 : 0,
				padding: t ? "8px 24px" : 0,
				background: t || void 0,
				borderRadius: t ? 16 : 0
			},
			children: s
		}), c && /* @__PURE__ */ (0, $.jsx)("span", {
			style: {
				fontFamily: d,
				fontWeight: 700,
				fontSize: 48,
				color: "#ffe600",
				textTransform: "uppercase",
				textShadow: "1px 1px 2px rgba(0, 0, 0, 0.8)",
				letterSpacing: 0,
				lineHeight: 1.2,
				marginTop: 2,
				padding: t ? "8px 24px" : 0,
				background: t || void 0,
				borderRadius: t ? 16 : 0
			},
			children: c
		})]
	});
}, Lt = ({ text: e, backgroundColor: t, position: n = "bottom", style: r = {}, animationFrame: i = 0, showTop: a = !0, showBottom: o = !0, topBg: s = "#ff8800", bottomColor: c = "#ff8800", bottomBg: l = "#fff", fontFamily: u }) => {
	let [d, f] = e.split("\n").length > 1 ? e.split("\n") : [e, ""], p = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(e), m = Math.max(0, Math.min((i - 0) / 15, 1)), h = {
		transform: `scale(${.8 + .2 * m}) translateY(${20 * (1 - m)}px)`,
		opacity: m
	}, g = Math.max(0, Math.min((i - 15) / 15, 1)), _ = {
		transform: `scale(${.8 + .2 * g}) translateY(${20 * (1 - g)}px)`,
		opacity: g
	}, v = {
		position: "absolute",
		left: 0,
		right: 0,
		[n]: 120,
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		pointerEvents: "none",
		gap: 12,
		zIndex: 1e3,
		...r
	}, y = u || (p ? "Cairo, \"Noto Sans Arabic\", \"Amiri\", \"Scheherazade\", sans-serif" : "Roboto, \"Open Sans\", Arial, sans-serif");
	return /* @__PURE__ */ (0, $.jsxs)("div", {
		style: v,
		children: [a && d && /* @__PURE__ */ (0, $.jsx)("span", {
			style: {
				fontFamily: y,
				fontWeight: 900,
				fontSize: 54,
				color: "#fff",
				background: s,
				borderRadius: 32,
				padding: "10px 32px",
				marginBottom: 6,
				textAlign: "center",
				direction: p ? "rtl" : "ltr",
				textTransform: p ? void 0 : "uppercase",
				boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
				letterSpacing: 1.2,
				...h
			},
			children: d
		}), o && f && /* @__PURE__ */ (0, $.jsx)("span", {
			style: {
				fontFamily: y,
				fontWeight: 900,
				fontSize: 54,
				color: c,
				background: l,
				borderRadius: 32,
				padding: "10px 32px",
				textAlign: "center",
				direction: p ? "rtl" : "ltr",
				textTransform: p ? void 0 : "uppercase",
				boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
				letterSpacing: 1.2,
				..._
			},
			children: f
		})]
	});
}, Rt = ({ text: e, backgroundColor: t = "#000000", textColor: n = "#ffffff", position: r = "bottom", style: i = {}, fontFamily: a, fontSize: o = 48, fontWeight: s = "bold" }) => {
	let c = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(e), l = a || (c ? "Cairo, 'Noto Sans Arabic', 'Arabic Typesetting', Arial, sans-serif" : "Roboto, 'Segoe UI', Arial, sans-serif");
	return /* @__PURE__ */ (0, $.jsx)("div", {
		style: {
			position: "absolute",
			left: 0,
			right: 0,
			display: "flex",
			justifyContent: "center",
			alignItems: "center",
			padding: "0 40px",
			pointerEvents: "none",
			zIndex: 1e3,
			...(() => {
				switch (r) {
					case "top": return { top: 120 };
					case "center": return {
						top: "50%",
						transform: "translateY(-50%)"
					};
					default: return { bottom: 120 };
				}
			})(),
			...i
		},
		children: /* @__PURE__ */ (0, $.jsx)("div", {
			style: {
				fontFamily: l,
				fontSize: o,
				fontWeight: s,
				color: n,
				backgroundColor: t,
				padding: "12px 24px",
				borderRadius: 0,
				textAlign: "center",
				textTransform: "none",
				letterSpacing: .5,
				lineHeight: 1.3,
				maxWidth: "80%",
				wordWrap: "break-word",
				direction: c ? "rtl" : "ltr",
				textShadow: "2px 2px 4px rgba(0, 0, 0, 0.7)",
				boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
				display: "inline-block"
			},
			children: e
		})
	});
}, zt = ({ text: e, backgroundColor: t = "#007acc", position: n = "bottom", style: r = {}, fontFamily: i, startFrame: a, endFrame: o }) => {
	let s = d(), c = e.trim().split(/\s+/), l = c.length, u = o - a, f = Math.max(0, s - a), p = Math.max(0, Math.min(1, f / u)), m = Math.min(Math.floor(p * l), l - 1), h = {
		position: "absolute",
		left: 0,
		right: 0,
		display: "flex",
		flexWrap: "wrap",
		justifyContent: "center",
		alignItems: "center",
		gap: 0,
		padding: "0 40px",
		pointerEvents: "none",
		zIndex: 1e3,
		...(() => {
			switch (n) {
				case "top": return { top: 120 };
				case "center": return {
					top: "50%",
					transform: "translateY(-50%)"
				};
				default: return { bottom: 120 };
			}
		})(),
		...r
	}, g = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(e), _ = i || (g ? "Cairo, 'Noto Sans Arabic', 'Arabic Typesetting', Arial, sans-serif" : "Roboto, 'Segoe UI', Arial, sans-serif");
	return /* @__PURE__ */ (0, $.jsx)("div", {
		style: h,
		children: c.map((e, n) => {
			let r = n === m;
			return /* @__PURE__ */ (0, $.jsx)("span", {
				style: {
					fontFamily: _,
					fontSize: 48,
					fontWeight: 700,
					color: "#ffffff",
					padding: "4px 6px",
					margin: "0 0.5px",
					borderRadius: 8,
					backgroundColor: r ? t : "transparent",
					transition: "background-color 0.2s ease",
					textTransform: "none",
					letterSpacing: 0,
					lineHeight: 1.2,
					textShadow: "-2px -2px 0 rgba(0, 0, 0, 0.8), 2px -2px 0 rgba(0, 0, 0, 0.8), -2px 2px 0 rgba(0, 0, 0, 0.8), 2px 2px 0 rgba(0, 0, 0, 0.8), 0px -2px 0 rgba(0, 0, 0, 0.8), 0px 2px 0 rgba(0, 0, 0, 0.8), -2px 0px 0 rgba(0, 0, 0, 0.8), 2px 0px 0 rgba(0, 0, 0, 0.8), -1px -1px 0 rgba(0, 0, 0, 0.8), 1px -1px 0 rgba(0, 0, 0, 0.8), -1px 1px 0 rgba(0, 0, 0, 0.8), 1px 1px 0 rgba(0, 0, 0, 0.8), 3px 3px 4px rgba(0, 0, 0, 0.5)",
					boxShadow: r ? "0 2px 8px rgba(0,0,0,0.4)" : "none",
					transform: r ? "scale(1.05)" : "scale(1)",
					display: "inline-block",
					direction: g ? "rtl" : "ltr"
				},
				children: e
			}, n);
		})
	});
}, Bt = ({ text: e, backgroundColor: t = "#ff8800", position: n = "bottom", style: r = {}, fontFamily: i, animationFrame: a = 0 }) => {
	let o = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(e), s = Math.max(0, Math.min(a / 15, 1)), c = {
		transform: `scale(${.8 + .2 * s}) translateY(${20 * (1 - s)}px)`,
		opacity: s
	};
	return /* @__PURE__ */ (0, $.jsx)("div", {
		style: {
			position: "absolute",
			left: 0,
			right: 0,
			[n]: 120,
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			pointerEvents: "none",
			gap: 12,
			zIndex: 1e3,
			...r
		},
		children: /* @__PURE__ */ (0, $.jsx)("span", {
			style: {
				fontFamily: i || (o ? "Cairo, \"Noto Sans Arabic\", \"Amiri\", \"Scheherazade\", sans-serif" : "Roboto, \"Open Sans\", Arial, sans-serif"),
				fontWeight: 900,
				fontSize: 54,
				color: "#fff",
				background: t,
				borderRadius: 0,
				padding: "10px 32px",
				textAlign: "center",
				direction: o ? "rtl" : "ltr",
				textTransform: o ? void 0 : "uppercase",
				boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
				letterSpacing: 1.2,
				...c
			},
			children: e
		})
	});
};
kt.object({}).passthrough();
function Vt(e) {
	return "editState" in e && e.editState !== void 0 && e.editState.tracks?.video?.length > 0;
}
var Ht = (e) => {
	switch (e) {
		case "fade":
		case "zoom-in":
		case "zoom-out":
		case "slide-left":
		case "slide-right":
		case "slide-up":
		case "slide-down":
		case "none": return e;
		default: return "none";
	}
}, Ut = (e) => e === "image" || e === "generated" ? "image" : "video", Wt = ({ src: e, transitionType: t, videoWidth: n, videoHeight: r, leftOffset: a, topOffset: o, clipIndex: s, clipDurationFrames: c, transitionFrames: l, isFirstClip: u, isLastClip: f, mediaType: p, animation: m, startFrom: h, playbackRate: g, clipDuration: _ }) => {
	let v = d(), y = 1;
	if (!u && v < l) {
		let e = Math.min(1, Math.max(0, v / l));
		y = t === "zoom-in" ? .7 + .3 * e : 1.4 - .4 * e;
	} else if (!f && v >= c - l) {
		let e = v - (c - l), n = Math.min(1, Math.max(0, e / l));
		y = t === "zoom-in" ? 1 + .2 * n : 1 - .3 * n;
	}
	return /* @__PURE__ */ (0, $.jsx)(i, {
		style: {
			width: n,
			height: r,
			left: a,
			top: o,
			opacity: 1,
			transform: `scale(${y})`,
			transformOrigin: "center center",
			willChange: "transform",
			backfaceVisibility: "hidden",
			perspective: 1e3,
			transformStyle: "preserve-3d",
			filter: "none",
			contain: "layout style paint",
			isolation: "isolate",
			zIndex: 200 + s
		},
		children: /* @__PURE__ */ (0, $.jsx)(jt, {
			src: e,
			mediaType: p,
			animation: m,
			duration: _,
			startFrom: h,
			playbackRate: g
		})
	});
}, Gt = ({ src: e, videoWidth: t, videoHeight: n, leftOffset: r, topOffset: a, clipIndex: o, clipDurationFrames: s, transitionFrames: c, isFirstClip: l, isLastClip: u, mediaType: f, animation: p, startFrom: m, playbackRate: h, clipDuration: g }) => {
	let _ = d(), v = 1;
	if (!l && _ < c) v = Math.min(1, Math.max(0, _ / c));
	else if (!u && _ >= s - c) {
		let e = _ - (s - c);
		v = 1 - Math.min(1, Math.max(0, e / c));
	}
	return v < .001 ? null : /* @__PURE__ */ (0, $.jsx)(i, {
		style: {
			width: t,
			height: n,
			left: r,
			top: a,
			opacity: v,
			zIndex: 100 + o,
			willChange: "opacity"
		},
		children: /* @__PURE__ */ (0, $.jsx)(jt, {
			src: e,
			mediaType: f,
			animation: p,
			duration: g,
			startFrom: m,
			playbackRate: h
		})
	});
}, Kt = ({ src: e, transitionType: t, videoWidth: n, videoHeight: r, leftOffset: a, topOffset: o, clipIndex: s, clipDurationFrames: c, transitionFrames: l, isFirstClip: u, isLastClip: f, mediaType: p, animation: m, startFrom: h, playbackRate: g, clipDuration: _ }) => {
	let v = d(), y = 0, b = 0;
	if (!u && v < l) {
		let e = Math.min(1, Math.max(0, v / l));
		switch (t) {
			case "slide-left":
				y = (1 - e) * n;
				break;
			case "slide-right":
				y = -(1 - e) * n;
				break;
			case "slide-up":
				b = (1 - e) * r;
				break;
			case "slide-down":
				b = -(1 - e) * r;
				break;
		}
	} else if (!f && v >= c - l) {
		let e = v - (c - l), i = Math.min(1, Math.max(0, e / l));
		switch (t) {
			case "slide-left":
				y = -i * n;
				break;
			case "slide-right":
				y = i * n;
				break;
			case "slide-up":
				b = -i * r;
				break;
			case "slide-down":
				b = i * r;
				break;
		}
	}
	return /* @__PURE__ */ (0, $.jsx)(i, {
		style: {
			width: n,
			height: r,
			left: a,
			top: o,
			transform: `translateX(${y}px) translateY(${b}px)`,
			zIndex: 150 + s,
			willChange: "transform"
		},
		children: /* @__PURE__ */ (0, $.jsx)(jt, {
			src: e,
			mediaType: p,
			animation: m,
			duration: _,
			startFrom: h,
			playbackRate: g
		})
	});
}, qt = ({ src: e, videoWidth: t, videoHeight: n, leftOffset: r, topOffset: a, clipIndex: o, mediaType: s, animation: c, startFrom: l, playbackRate: u, clipDuration: d }) => /* @__PURE__ */ (0, $.jsx)(i, {
	style: {
		width: t,
		height: n,
		left: r,
		top: a,
		zIndex: 100 + o
	},
	children: /* @__PURE__ */ (0, $.jsx)(jt, {
		src: e,
		mediaType: s,
		animation: c,
		duration: d,
		startFrom: l,
		playbackRate: u
	})
}), Jt = ({ subtitles: e, fps: t }) => /* @__PURE__ */ (0, $.jsx)(i, { children: e.map((e) => {
	let n = Math.max(1, e.end_frame - e.start_frame);
	return n <= 0 ? null : /* @__PURE__ */ (0, $.jsx)(c, {
		from: e.start_frame,
		durationInFrames: n,
		layout: "none",
		children: /* @__PURE__ */ (0, $.jsx)(Yt, {
			subtitle: e,
			fps: t,
			durationFrames: n
		})
	}, e.id);
}) }), Yt = ({ subtitle: e, fps: t, durationFrames: n }) => {
	let r = d();
	switch (e.style || "default") {
		case "progressive_highlight": return /* @__PURE__ */ (0, $.jsx)(Ft, {
			text: e.text,
			backgroundColor: e.config.backgroundColor || "#007acc",
			position: e.position || "bottom",
			startFrame: 0,
			endFrame: n,
			fontFamily: e.config.fontFamily
		});
		case "tiktok_trending": return /* @__PURE__ */ (0, $.jsx)(It, {
			text: e.text,
			backgroundColor: e.config.backgroundColor,
			position: e.position || "bottom",
			animationFrame: r,
			fontFamily: e.config.fontFamily
		});
		case "arabic_banner": return /* @__PURE__ */ (0, $.jsx)(Lt, {
			text: e.text,
			backgroundColor: e.config.backgroundColor,
			position: e.position || "bottom",
			animationFrame: r,
			fontFamily: e.config.fontFamily
		});
		case "rectangular": return /* @__PURE__ */ (0, $.jsx)(Rt, {
			text: e.text,
			backgroundColor: e.config.backgroundColor || "#000000",
			textColor: e.config.color || "#ffffff",
			position: e.position || "bottom",
			fontFamily: e.config.fontFamily,
			fontSize: e.config.fontSize,
			fontWeight: e.config.bold ? "900" : "bold"
		});
		case "rounded_progressive": return /* @__PURE__ */ (0, $.jsx)(zt, {
			text: e.text,
			backgroundColor: e.config.backgroundColor,
			position: e.position || "bottom",
			startFrame: 0,
			endFrame: n
		});
		case "rectangular_banner": return /* @__PURE__ */ (0, $.jsx)(Bt, {
			text: e.text,
			backgroundColor: e.config.backgroundColor,
			position: e.position || "bottom",
			animationFrame: r
		});
		default: {
			let i = Math.max(1, Math.round(.3 * t)), a = 1, o = "translateY(0px)";
			if (r < i) {
				let e = r / i;
				a = Math.max(0, Math.min(1, e));
			} else if (r > n - i) {
				let e = (n - r) / i;
				a = Math.max(0, Math.min(1, e));
			}
			let s = {};
			switch (e.position) {
				case "top":
					s = {
						top: "10%",
						bottom: "auto"
					};
					break;
				case "center":
					s = {
						top: "50%",
						transform: `translateY(-50%) ${o}`
					};
					break;
				default:
					s = {
						bottom: "10%",
						top: "auto"
					};
					break;
			}
			let c = e.config.backgroundColor || "rgba(0, 0, 0, 0.8)";
			return c === "rainbow" && (c = "linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57, #ff9ff3)"), /* @__PURE__ */ (0, $.jsx)("div", {
				style: {
					position: "absolute",
					left: "50%",
					transform: `translateX(-50%) ${o}`,
					...s,
					padding: "12px 24px",
					borderRadius: "8px",
					background: c,
					color: e.config.color || "#ffffff",
					fontSize: e.config.fontSize || "32px",
					fontWeight: e.config.bold ? 900 : "bold",
					textAlign: "center",
					opacity: a,
					fontFamily: e.config.fontFamily || "Arial, sans-serif",
					textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
					maxWidth: "80%",
					wordWrap: "break-word",
					zIndex: 1e3
				},
				children: e.text
			});
		}
	}
}, Xt = ({ overlays: e }) => {
	let t = d();
	return /* @__PURE__ */ (0, $.jsx)(i, { children: e.map((e) => {
		if (!(t >= e.start_frame && t <= e.end_frame)) return null;
		let n = e.end_frame === e.start_frame ? 1 : (t - e.start_frame) / (e.end_frame - e.start_frame), r = e.opacity;
		e.animation === "fade" && (r = (Math.sin(n * Math.PI * 4) * .3 + .7) * e.opacity);
		let i = {};
		switch (e.position) {
			case "top-left":
				i = {
					top: "20px",
					left: "20px"
				};
				break;
			case "top-right":
				i = {
					top: "20px",
					right: "20px"
				};
				break;
			case "bottom-left":
				i = {
					bottom: "20px",
					left: "20px"
				};
				break;
			case "bottom-right":
				i = {
					bottom: "20px",
					right: "20px"
				};
				break;
			case "center":
				i = {
					top: "50%",
					left: "50%",
					transform: "translate(-50%, -50%)"
				};
				break;
			default:
				i = {
					top: "20px",
					right: "20px"
				};
				break;
		}
		return /* @__PURE__ */ (0, $.jsx)("div", {
			style: {
				position: "absolute",
				...i,
				opacity: r,
				zIndex: 500
			},
			children: /* @__PURE__ */ (0, $.jsx)(o, {
				src: e.src,
				style: {
					width: e.width,
					objectFit: "contain"
				},
				alt: "Overlay"
			})
		}, e.id);
	}) });
}, Zt = ({ audioTracks: e }) => {
	let t = d();
	return /* @__PURE__ */ (0, $.jsx)($.Fragment, { children: e.map((e) => /* @__PURE__ */ (0, $.jsx)(a, {
		src: e.url.startsWith("http") ? e.url : u(e.url),
		volume: (() => {
			if (t < e.start_frame || t > e.end_frame) return 0;
			let n = e.volume;
			if (e.fade_in_frames > 0 && t < e.start_frame + e.fade_in_frames) {
				let r = l(t, [e.start_frame, e.start_frame + e.fade_in_frames], [0, 1], {
					extrapolateLeft: "clamp",
					extrapolateRight: "clamp"
				});
				n *= r;
			}
			if (e.fade_out_frames > 0 && t > e.end_frame - e.fade_out_frames) {
				let r = l(t, [e.end_frame - e.fade_out_frames, e.end_frame], [1, 0], {
					extrapolateLeft: "clamp",
					extrapolateRight: "clamp"
				});
				n *= r;
			}
			return Math.max(0, n);
		})()
	}, e.id)) });
}, Qt = (e) => {
	let t = e, n = Vt(t) ? t.editState : Pt(t), { width: r, height: a, fps: o, durationInFrames: s } = f(), l = n.fps || o, u = n.width || r, d = n.height || a, p = Math.round((r - u) / 2), m = Math.round((a - d) / 2), h = [...n.tracks.video || []].sort((e, t) => e.start_frame - t.start_frame), g = n.tracks.subtitles || [], _ = n.tracks.overlays || [], v = n.tracks.audio || [], y = n.tracks.motion_graphics || [], b = h.map((e, t) => {
		let n = Math.max(1, e.end_frame - e.start_frame), r = t > 0 ? h[t - 1] : null, i = Math.max(0, r?.transition_out?.duration_frames ?? 0), a = Math.max(0, e.transition_out?.duration_frames ?? 0), o = Math.max(0, e.start_frame - i), s = Math.max(1, n + i + (t === h.length - 1 ? 0 : a)), f = Ht(r?.transition_out?.type), g = Ht(e.transition_out?.type), _ = g === "none" ? f : g, v = Math.max(1, i, a), y = t === 0, b = t === h.length - 1, x = e.animation === "zoom-in" || e.animation === "zoom-out" ? e.animation : "none", S = e.speed && e.speed > 0 ? e.speed : 1, C = Ut(e.media_type), w = Math.max(0, e.trim_in || 0), T = Math.max(1, (e.trim_out || n) - w) / l;
		return _ === "zoom-in" || _ === "zoom-out" ? /* @__PURE__ */ (0, $.jsx)(c, {
			from: o,
			durationInFrames: s,
			layout: "none",
			showInTimeline: !0,
			children: /* @__PURE__ */ (0, $.jsx)(Wt, {
				src: e.clip_url,
				transitionType: _,
				videoWidth: u,
				videoHeight: d,
				leftOffset: p,
				topOffset: m,
				clipIndex: t,
				clipDurationFrames: s,
				transitionFrames: v,
				isFirstClip: y,
				isLastClip: b,
				mediaType: C,
				animation: x,
				startFrom: w,
				playbackRate: S,
				clipDuration: T
			})
		}, e.id) : _ === "fade" ? /* @__PURE__ */ (0, $.jsx)(c, {
			from: o,
			durationInFrames: s,
			layout: "none",
			showInTimeline: !0,
			children: /* @__PURE__ */ (0, $.jsx)(Gt, {
				src: e.clip_url,
				videoWidth: u,
				videoHeight: d,
				leftOffset: p,
				topOffset: m,
				clipIndex: t,
				clipDurationFrames: s,
				transitionFrames: v,
				isFirstClip: y,
				isLastClip: b,
				mediaType: C,
				animation: x,
				startFrom: w,
				playbackRate: S,
				clipDuration: T
			})
		}, e.id) : _ === "slide-left" || _ === "slide-right" || _ === "slide-up" || _ === "slide-down" ? /* @__PURE__ */ (0, $.jsx)(c, {
			from: o,
			durationInFrames: s,
			layout: "none",
			showInTimeline: !0,
			children: /* @__PURE__ */ (0, $.jsx)(Kt, {
				src: e.clip_url,
				transitionType: _,
				videoWidth: u,
				videoHeight: d,
				leftOffset: p,
				topOffset: m,
				clipIndex: t,
				clipDurationFrames: s,
				transitionFrames: v,
				isFirstClip: y,
				isLastClip: b,
				mediaType: C,
				animation: x,
				startFrom: w,
				playbackRate: S,
				clipDuration: T
			})
		}, e.id) : /* @__PURE__ */ (0, $.jsx)(c, {
			from: o,
			durationInFrames: s,
			layout: "none",
			showInTimeline: !0,
			children: /* @__PURE__ */ (0, $.jsx)(qt, {
				src: e.clip_url,
				videoWidth: u,
				videoHeight: d,
				leftOffset: p,
				topOffset: m,
				clipIndex: t,
				mediaType: C,
				animation: x,
				startFrom: w,
				playbackRate: S,
				clipDuration: T
			})
		}, e.id);
	});
	return /* @__PURE__ */ (0, $.jsx)(c, {
		durationInFrames: Math.max(1, s, n.total_frames),
		layout: "none",
		children: /* @__PURE__ */ (0, $.jsxs)(i, {
			style: {
				backgroundColor: "#000000",
				willChange: "auto",
				transform: "translateZ(0)"
			},
			children: [
				b,
				v.length > 0 ? /* @__PURE__ */ (0, $.jsx)(Zt, { audioTracks: v }) : null,
				g.length > 0 ? /* @__PURE__ */ (0, $.jsx)(Jt, {
					subtitles: g,
					fps: l
				}) : null,
				_.length > 0 ? /* @__PURE__ */ (0, $.jsx)(Xt, { overlays: _ }) : null,
				y.map((e) => /* @__PURE__ */ (0, $.jsx)(c, {
					from: e.start_frame,
					durationInFrames: Math.max(1, e.end_frame - e.start_frame),
					layout: "none",
					children: null
				}, e.id))
			]
		})
	});
};
//#endregion
//#region remotion/browser/VideoPreviewPlayer.tsx
function $t({ editState: e, projectId: i, projectName: a }) {
	let o = t(null), [s, c] = n(!1);
	if (!e || !e.tracks) return /* @__PURE__ */ (0, $.jsx)("div", {
		style: tn,
		children: "No preview available - complete the video generation first."
	});
	let { fps: l = 30, total_frames: u = 300, width: d = 1080, height: f = 1920 } = e, p = d / f, m, h;
	p >= 1 ? (m = Math.min(900, d), h = m / p) : (h = Math.min(600, f), m = h * p);
	let g = () => {
		o.current && (s ? o.current.pause() : o.current.play(), c(!s));
	}, _ = () => {
		o.current && (o.current.seekTo(0), c(!1));
	}, v = (w) => {
		if (!o.current) return;
		let E = Number.isFinite(w) ? Math.max(0, Math.min(u, Math.round(w))) : 0;
		o.current.seekTo(E);
	}, y = (w) => {
		v(w * l);
	};
	typeof window < "u" && (window.VidsAIPlayer = window.VidsAIPlayer || {}, window.VidsAIPlayer.bridge = {
		play: () => {
			o.current && (o.current.play(), c(!0));
		},
		pause: () => {
			o.current && (o.current.pause(), c(!1));
		},
		toggle: g,
		restart: _,
		seekToFrame: v,
		seekToTime: y,
		getCurrentFrame: () => o.current ? o.current.getCurrentFrame() : 0,
		getCurrentTime: () => {
			let E = o.current ? o.current.getCurrentFrame() : 0;
			return E / l;
		},
		isPlaying: () => s,
		fps: l,
		totalFrames: u
	});
	return /* @__PURE__ */ (0, $.jsxs)("div", {
		style: en,
		"data-project-id": i,
		"data-project-name": a,
		children: [
			/* @__PURE__ */ (0, $.jsx)("div", {
				style: {
					borderRadius: 8,
					overflow: "hidden",
					boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
					background: "#000"
				},
				children: /* @__PURE__ */ (0, $.jsx)(r, {
					ref: o,
					component: Qt,
					inputProps: { editState: e },
					durationInFrames: u,
					fps: l,
					compositionWidth: d,
					compositionHeight: f,
					style: {
						width: m,
						height: h
					},
					controls: !1,
					loop: !1
				})
			}),
			/* @__PURE__ */ (0, $.jsxs)("div", {
				style: nn,
				children: [
					/* @__PURE__ */ (0, $.jsx)("button", {
						onClick: _,
						style: an,
						title: "Restart",
						type: "button",
						children: "Restart"
					}),
					/* @__PURE__ */ (0, $.jsx)("button", {
						onClick: g,
						style: {
							...an,
							background: "#2563EB",
							minWidth: 90
						},
						type: "button",
						children: s ? "Pause" : "Play"
					}),
					/* @__PURE__ */ (0, $.jsxs)("span", {
						style: on,
						children: [
							Math.round(u / l),
							"s · ",
							d,
							"x",
							f,
							" · ",
							e.metadata?.language ?? "en"
						]
					})
				]
			}),
			/* @__PURE__ */ (0, $.jsx)("div", {
				style: rn,
				children: [
					["Scenes", e.tracks.video?.length ?? 0],
					["Subtitles", e.tracks.subtitles?.length ?? 0],
					["Audio", e.tracks.audio?.length ?? 0],
					["Platform", e.metadata?.platform ?? "-"]
				].map(([e, t]) => /* @__PURE__ */ (0, $.jsxs)("div", {
					style: {
						display: "flex",
						flexDirection: "column",
						gap: 2
					},
					children: [/* @__PURE__ */ (0, $.jsx)("span", {
						style: {
							color: "#475569",
							fontSize: 11,
							textTransform: "uppercase",
							letterSpacing: "0.05em"
						},
						children: e
					}), /* @__PURE__ */ (0, $.jsx)("span", {
						style: {
							color: "#F1F5F9",
							fontSize: 15,
							fontWeight: 600
						},
						children: String(t)
					})]
				}, e))
			})
		]
	});
}
var en = {
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	gap: 16,
	padding: 24,
	background: "#080B11",
	borderRadius: 12,
	border: "1px solid #1E2D40"
}, tn = {
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	background: "#0D1117",
	borderRadius: 8,
	padding: 40,
	color: "#475569",
	fontFamily: "Arial, sans-serif"
}, nn = {
	display: "flex",
	alignItems: "center",
	gap: 12,
	padding: "10px 20px",
	background: "#0D1117",
	borderRadius: 8,
	border: "1px solid #1E2D40"
}, rn = {
	display: "flex",
	gap: 24,
	flexWrap: "wrap",
	background: "#0D1117",
	border: "1px solid #1E2D40",
	borderRadius: 8,
	padding: "12px 20px",
	width: "100%",
	boxSizing: "border-box"
}, an = {
	background: "#1E2D40",
	color: "#F1F5F9",
	border: "1px solid #2D3F55",
	borderRadius: 6,
	padding: "8px 14px",
	cursor: "pointer",
	fontSize: 14,
	fontFamily: "Arial, sans-serif"
}, on = {
	color: "#475569",
	fontSize: 13,
	fontFamily: "Arial, sans-serif"
};
//#endregion
export { $t as VideoPreviewPlayer, $t as default };
