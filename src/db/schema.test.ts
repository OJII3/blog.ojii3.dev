import { describe, expect, it } from "bun:test";
import { posts, postTags, tags } from "./schema";

describe("content schema", () => {
	it("defines the content tables", () => {
		expect(posts.slug.name).toBe("slug");
		expect(posts.revision.name).toBe("revision");
		expect(tags.name.name).toBe("name");
		expect(postTags.postSlug.name).toBe("post_slug");
	});
});
