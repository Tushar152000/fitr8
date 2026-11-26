import { DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { describe, expect, it, vi } from "vitest";
import type { Env } from "../../config/config.module.js";
import { StorageService } from "./storage.service.js";

const env = { S3_BUCKET: "fitlens-meals", S3_REGION: "auto", S3_FORCE_PATH_STYLE: true } as Env;

describe("StorageService.deleteUserPhotos", () => {
  it("deletes every object under the user's meal and avatar prefixes, across pages", async () => {
    const service = new StorageService(env);
    const send = vi.fn(async (cmd: unknown) => {
      if (cmd instanceof ListObjectsV2Command) {
        if (cmd.input.Prefix === "avatars/u1/")
          return { Contents: [{ Key: "avatars/u1/me.jpg" }], IsTruncated: false };
        return cmd.input.ContinuationToken
          ? { Contents: [{ Key: "meals/u1/c.jpg" }], IsTruncated: false }
          : {
              Contents: [{ Key: "meals/u1/a.jpg" }, { Key: "meals/u1/b.jpg" }],
              IsTruncated: true,
              NextContinuationToken: "p2",
            };
      }
      return {};
    });
    (service as unknown as { s3: { send: typeof send } }).s3 = { send };

    await expect(service.deleteUserPhotos("u1")).resolves.toBe(4);
    const lists = send.mock.calls.map(([c]) => c).filter((c) => c instanceof ListObjectsV2Command);
    expect(lists.map((c) => (c as ListObjectsV2Command).input.Prefix)).toEqual([
      "meals/u1/",
      "meals/u1/",
      "avatars/u1/",
    ]);
    const deletes = send.mock.calls
      .map(([c]) => c)
      .filter((c) => c instanceof DeleteObjectsCommand) as DeleteObjectsCommand[];
    expect(deletes.flatMap((d) => d.input.Delete!.Objects!.map((o) => o.Key))).toEqual([
      "meals/u1/a.jpg",
      "meals/u1/b.jpg",
      "meals/u1/c.jpg",
      "avatars/u1/me.jpg",
    ]);
  });

  it("does nothing for a user without photos", async () => {
    const service = new StorageService(env);
    const send = vi.fn(async () => ({ Contents: [], IsTruncated: false }));
    (service as unknown as { s3: { send: typeof send } }).s3 = { send };
    await expect(service.deleteUserPhotos("u2")).resolves.toBe(0);
    expect(send).toHaveBeenCalledTimes(2); // one empty listing per prefix
  });
});
