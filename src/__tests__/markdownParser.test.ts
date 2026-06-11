import { IntermediateDocument, IntermediatePageMap } from "@hamster-note/types";
import {
	inspectMarkdown,
	isIntermediateTextLike,
	MARKDOWN_PARSER_PACKAGE_NAME,
	MarkdownDocument,
	MarkdownPage,
	MarkdownParser,
	markdownParserWorkspaceStatus,
} from "../index";

async function getDocumentMarkdown(
	doc: Awaited<ReturnType<typeof MarkdownParser.encode>>,
): Promise<string> {
	const pages = await doc.pages;
	const content = await pages[0].getContent();
	return content
		.filter(isIntermediateTextLike)
		.map((text) => text.content)
		.join("");
}

describe("MarkdownParser", () => {
	it("exports the public API", () => {
		expect(MARKDOWN_PARSER_PACKAGE_NAME).toBe("@hamster-note/markdown-parser");
		expect(markdownParserWorkspaceStatus).toBe("initialized");
		expect(MarkdownParser.ext).toBe("md");
		expect([...MarkdownParser.exts]).toEqual(["md", "markdown"]);
	});

	it("inspects ArrayBuffer input", async () => {
		const buffer = new TextEncoder().encode("# Hello").buffer;
		const result = await inspectMarkdown(buffer);
		expect(result.kind).toBe("array-buffer");
		expect(result.mimeType).toBe("text/markdown");
		expect(result.status).toBe("markdown-supported");
		expect(result.supportedExtensions).toEqual(["md", "markdown"]);
	});

	it("encodes UTF-8 markdown into an intermediate document", async () => {
		const doc = await MarkdownParser.encode(
			new TextEncoder().encode("# Hello\n\n- A\n- B"),
		);
		expect(doc.id).toBe("markdown-parser-document");
		expect(doc.title).toBe("Hello");
		const pages = await doc.pages;
		expect(pages.length).toBe(1);
		expect(pages[0].id).toBe("markdown-parser-page-1");
		expect(await getDocumentMarkdown(doc)).toContain("# Hello");
	});

	it("decodes an intermediate document back into markdown bytes", async () => {
		const source = "# Hello\n\n| A | B |\n| - | - |\n| 1 | 2 |";
		const doc = await MarkdownParser.encode(new TextEncoder().encode(source));
		const decoded = await MarkdownParser.decode(doc);
		const text = new TextDecoder("utf-8").decode(decoded);
		expect(text).toContain("# Hello");
		expect(text).toContain("| A | B |");
	});

	it("rejects invalid UTF-8 bytes during encode", async () => {
		const invalid = new Uint8Array([0xc3, 0x28]);
		await expect(MarkdownParser.encode(invalid)).rejects.toThrow(
			"MarkdownParser 编码失败：",
		);
	});

	it("throws when decode receives a document with no pages", async () => {
		const doc = new IntermediateDocument({
			id: "empty",
			title: "Empty",
			pagesMap: new IntermediatePageMap(),
			outline: undefined,
		});
		await expect(MarkdownParser.decode(doc)).rejects.toThrow(
			"MarkdownParser 解码失败：中间文档不包含可解码页面",
		);
	});

	it("instance methods delegate to static methods", async () => {
		const parser = new MarkdownParser();
		const doc = await parser.encode(new TextEncoder().encode("**Bold**"));
		const decoded = await parser.decode(doc);
		const text = new TextDecoder("utf-8").decode(decoded);
		expect(text).toContain("**Bold**");
	});
});

describe("MarkdownDocument", () => {
	it("wraps an intermediate document and exposes metadata", async () => {
		const doc = await MarkdownParser.encode(
			new TextEncoder().encode("# Title\n\nSome content"),
		);
		const mdDoc = new MarkdownDocument(doc);
		expect(mdDoc.getTitle()).toBe("Title");
		expect(mdDoc.getId()).toBe("markdown-parser-document");
		expect(mdDoc.getIntermediateDocument()).toBe(doc);
	});

	it("getPages returns MarkdownPage instances", async () => {
		const doc = await MarkdownParser.encode(
			new TextEncoder().encode("# Hello"),
		);
		const mdDoc = new MarkdownDocument(doc);
		const pages = await mdDoc.getPages();
		expect(pages).toHaveLength(1);
		expect(pages[0]).toBeInstanceOf(MarkdownPage);
	});

	it("getPage returns a specific page by number", async () => {
		const doc = await MarkdownParser.encode(
			new TextEncoder().encode("# Hello"),
		);
		const mdDoc = new MarkdownDocument(doc);
		const page = await mdDoc.getPage(1);
		expect(page).toBeDefined();
		expect(page!.getNumber()).toBe(1);
	});

	it("getPage returns undefined for nonexistent page", async () => {
		const doc = await MarkdownParser.encode(
			new TextEncoder().encode("# Hello"),
		);
		const mdDoc = new MarkdownDocument(doc);
		const page = await mdDoc.getPage(999);
		expect(page).toBeUndefined();
	});

	it("getOutline returns undefined when no outline exists", async () => {
		const doc = await MarkdownParser.encode(
			new TextEncoder().encode("Plain text without headings"),
		);
		const mdDoc = new MarkdownDocument(doc);
		expect(mdDoc.getOutline()).toBeUndefined();
	});
});

describe("MarkdownPage", () => {
	it("getNumber returns the page number", async () => {
		const doc = await MarkdownParser.encode(
			new TextEncoder().encode("# Hello"),
		);
		const mdDoc = new MarkdownDocument(doc);
		const page = (await mdDoc.getPages())[0];
		expect(page.getNumber()).toBe(1);
	});

	it("getSize returns scaled dimensions", async () => {
		const doc = await MarkdownParser.encode(
			new TextEncoder().encode("# Hello"),
		);
		const mdDoc = new MarkdownDocument(doc);
		const page = (await mdDoc.getPages())[0];
		const size = page.getSize(2);
		expect(size.x).toBeGreaterThan(0);
		expect(size.y).toBeGreaterThan(0);
	});

	it("getPureText returns the markdown content", async () => {
		const source = "# Hello\n\nSome content";
		const doc = await MarkdownParser.encode(new TextEncoder().encode(source));
		const mdDoc = new MarkdownDocument(doc);
		const page = (await mdDoc.getPages())[0];
		const text = await page.getPureText();
		expect(text).toContain("# Hello");
		expect(text).toContain("Some content");
	});
});
