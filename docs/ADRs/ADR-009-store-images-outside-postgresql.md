# ADR-009: Store images outside PostgreSQL

**Status:** Accepted (2026-09-17), PRs #40 and #56.

**Context.** Farmers upload crop photos, and every user can have a profile photo. Storing binary images in PostgreSQL would inflate the database, backups and the free Neon storage quota. The App Service's local disk is not durable across deployments either.

**ADR-009 options**

| Option | For | Against |
|---|---|---|
| Images in PostgreSQL (`bytea`) | One store and one backup | Database size and backup time grow quickly; free-tier limits |
| **External media storage (Cloudinary), with metadata in PostgreSQL** | Keeps binary data out of the database; CDN delivery for profile photos; authenticated delivery for issue photos | An external dependency and credentials to protect |
| Local file system | Simple for development | Lost on redeploy; not suitable for production |

**Decision.**

- **Storage.** Store images in Cloudinary through `IImageStorageService` and `IProfilePhotoStorage`. Issue photos are *authenticated* assets under random names, served only through an authorised API call. Profile photos are public.
- **Metadata.** PostgreSQL keeps only the metadata: storage key, content type, size and dimensions.
- **Development.** Uses a local-disk implementation of the same interfaces when Cloudinary is not configured.

**Consequences.**

- (+) A small database, and media storage that can be changed without touching the domain model.
- (−) An external dependency. Upload failures must be handled, and Cloudinary credentials are kept only in configuration.
