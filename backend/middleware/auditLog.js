/**
 * attachAuditLogging(schema, modelName)
 *
 * Wires up Mongoose pre/post hooks so that every create, update, and delete
 * on this schema automatically writes a matching entry to the Audit
 * collection - no route handler has to remember to log anything.
 *
 * How each route style is covered:
 *   - `new Model(data); doc.save()`            -> "save" document hook
 *   - `Model.findByIdAndUpdate(id, updates)`   -> "findOneAndUpdate" query hook
 *   - `Model.findByIdAndDelete(id)`            -> "findOneAndDelete" query hook
 *
 * `performedBy` / `role` are read from the query options (routes pass them
 * in as `{ performedBy, role }` alongside `new`/`runValidators`) so this
 * file doesn't need to know anything about Express or req/res.
 */
function attachAuditLogging(schema, modelName) {
  // require() is deferred to avoid a circular require between models at load time
  function Audit() {
    return require("../models/Audit");
  }

  // ---- create: new Doc(...).save() ----
  schema.pre("save", function (next) {
    this.$locals.wasNew = this.isNew;
    next();
  });

  schema.post("save", async function (doc) {
    try {
      await Audit().create({
        action: doc.$locals.wasNew ? "create" : "update",
        model: modelName,
        documentId: doc._id,
        performedBy: doc.$locals.performedBy || "unknown",
        role: doc.$locals.role || "unknown",
        changes: doc.toObject(),
      });
    } catch (err) {
      // Audit logging must never break the actual request
      console.error(`Audit log (save) failed for ${modelName}:`, err.message);
    }
  });

  // ---- update: Model.findByIdAndUpdate(...) ----
  // Routes pass `performedBy`/`role` in as extra query options. We pull them
  // off here, in a PRE hook, and delete them from the options object so
  // they never get forwarded to the MongoDB driver's actual update command
  // (some driver versions reject options they don't recognize).
  schema.pre("findOneAndUpdate", function (next) {
    const options = this.getOptions();
    this._auditPerformedBy = options.performedBy || "unknown";
    this._auditRole = options.role || "unknown";
    delete options.performedBy;
    delete options.role;
    next();
  });

  schema.post("findOneAndUpdate", async function (doc) {
    if (!doc) return; // nothing matched, nothing to log
    try {
      await Audit().create({
        action: "update",
        model: modelName,
        documentId: doc._id,
        performedBy: this._auditPerformedBy,
        role: this._auditRole,
        changes: this.getUpdate(),
      });
    } catch (err) {
      console.error(`Audit log (update) failed for ${modelName}:`, err.message);
    }
  });

  // ---- delete: Model.findByIdAndDelete(...) ----
  schema.pre("findOneAndDelete", function (next) {
    const options = this.getOptions();
    this._auditPerformedBy = options.performedBy || "unknown";
    this._auditRole = options.role || "unknown";
    delete options.performedBy;
    delete options.role;
    next();
  });

  schema.post("findOneAndDelete", async function (doc) {
    if (!doc) return;
    try {
      await Audit().create({
        action: "delete",
        model: modelName,
        documentId: doc._id,
        performedBy: this._auditPerformedBy,
        role: this._auditRole,
        changes: doc.toObject(),
      });
    } catch (err) {
      console.error(`Audit log (delete) failed for ${modelName}:`, err.message);
    }
  });
}

module.exports = { attachAuditLogging };
