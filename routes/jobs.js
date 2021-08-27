"use strict";

const express = require("express");

const jsonschema = require("jsonschema");
const { BadRequestError } = require("../expressError");
const { ensureAdmin } = require("../middleware/auth");
const Job = require("../models/job");
const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");
const jobSearchSchema = require("../schemas/jobSearch.json");

const router = express.Router({ mergeParams: true });

/**POST / { job } => { job }
 * 
 * job should be { title, salary, equity, companyHandle }
 *
 * Returns { id, title, salary, equity, companyHandle }
 * 
 * Authorization required: admin 
 */
router.post("/", ensureAdmin, async function (req, res, next) {
    try {
        const validator = jsonschema.validate(req.body, jobNewSchema);
        if(!validator.valid) {
            const errs = validator.errors.map(err => err.stack);
            throw new BadRequestError(errs)
        }
        const job = await Job.create(req.body);
        return res.status(201).json({ job });
    } catch (err) {
        return next(err);
    }
});

/** GET / => 
 * { jobs : [{ id, title, salary, equity, companyHandle, companyName}, ...]}
 * 
 * Can provide search filter in query:
 * - minSalary
 * - hasEquity (true returns only jobs with equity > 0, other values ignored)
 * - title (will find case-insensitive, partial matches)
 * 
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
    const query = req.query;
    //arrive as strings from querystring, but we want as int/bool
    if(query.minSalary !== undefined) query.minSalary = +query.minSalary;
    query.hasEquity = query.hasEquity === "true";

    try {
        const validator = jsonschema.validate(query, jobSearchSchema);
        if(!validator.valid) {
            const errs = validator.errors.map(err => err.stack);
            throw new BadRequestError(errs);
        }

        const jobs = await Job.findAll(query);
        return res.json({ jobs });
    } catch (err) {
        return next(err);
    }
});

/**GET /[jobId] => { job }
 * 
 * Returns { id, title, salary, equity, company }
 *  where comany is { handle, name, description, numEmployees, logoUrl }
 * 
 * Authorization required: none
 */

router.get("/:id", async function (req, res, next) {
    try {
        const job = await Job.get(req.params.id);
        return res.json({ job });
    } catch (err) {
        return next(err);
    }
});

/** PATCH /[JobId] {fld1, fld2, ...} => { job }
 * 
 * Data can include: { title, salary, equity }
 * 
 * Returns { id, title, salary, equity, companyHadle }
 * 
 * Authorization required: admin
 */


router.patch("/:id", ensureAdmin, async function (req, res, next) {
    try {
        const validator = jsonschema.validate(req.body, jobUpdateSchema);
        if(!validator.valid) {
            const errs = validator.errors.map(err => err.stack);
            throw new BadRequestError(errs);
        }

        const job = await Job.update(req.params.id, req.body);
        return res.json({ job });
        
    } catch (err) {
        return next(err);
    }
});

/**DELETE /[handle] => { deleted: id }
 * 
 * Authorization required: admin
 */

router.delete("/:id", ensureAdmin, async function (req, res, next) {
    try {
        await Job.remove(req.params.id);
        return res.json({ deleted: +req.params.id });
    } catch (err) {
        return next(err)
    }
});

module.exports = router;