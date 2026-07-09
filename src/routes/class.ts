import express from "express";
import {db} from "../db/index.js";
import {classes, departments, subjects, user} from "../db/schema/index.js";
import {and, desc, eq, getTableColumns, ilike, or, sql} from "drizzle-orm";

const router = express.Router();

//Get all subjects with optional search, filtering and pagination
router.get("/", async (req, res) => {
    try {
        const { search, subject, teacher, page = 1, limit = 10 } = req.query;

        const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
        const limitPerPage = Math.min(Math.max(1, parseInt(String(limit), 10) || 10), 100);

        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        //If search query exists, filter by subject name or invite code
        if (search){
            filterConditions.push(
                or(
                    ilike(classes.name, `%${search}%`),
                    ilike(classes.inviteCode, `%${search}%`),
                )
            );
        }

        // If subject filter exists, match subject name
        if (subject) {
            const subjectPattern = `%${String(subject).replace(/[%_]/g, '\\$&')}%`;
            filterConditions.push(ilike(subjects.name, subjectPattern));
        }

        // If teacher filter exists, match teacher name
        if (teacher) {
            const teacherPattern = `%${String(teacher).replace(/[%_]/g, '\\$&')}%`;
            filterConditions.push(ilike(user.name, teacherPattern));
        }

        //Combine all filters using AND if any exist
        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

        const countResult = await db
            .select({count: sql<number>`count(*)`})
            .from(classes)
            .leftJoin(subjects, eq(classes.subjectId, subjects.id))
            .leftJoin(user, eq(classes.teacherId, user.id))
            .where(whereClause);

        const totalCount = countResult[0]?.count ?? 0;

        const classesList = await db
            .select({
                ...getTableColumns(classes),
                subject: { ...getTableColumns(subjects) },
                teacher: { ...getTableColumns(user) }
            })
            .from(classes)
            .leftJoin(subjects, eq(classes.subjectId, subjects.id))
            .leftJoin(user, eq(classes.teacherId, user.id))
            .where(whereClause)
            .orderBy(desc(classes.createdAt))
            .limit(limitPerPage)
            .offset(offset);


        res.status(200).json({
            data: classesList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage),
            }
        })

    }catch(err) {
        console.error(`GET /classes error: ${err}`);
        res.status(500).json({ error: 'Failed to get classes' });
    }
})

router.get('/:id', async (req, res) => {
    const classId = Number(req.params.id);

    if(!Number.isFinite(classId)) return res.status(400).json({ error: 'No Class found.' });

    const [classDetails] = await db
        .select({
            ...getTableColumns(classes),
            subject: {
                ...getTableColumns(subjects),
            },
            department: {
                ...getTableColumns(departments),
            },
            teacher: {
                ...getTableColumns(user),
            }
        })
        .from(classes)
        .leftJoin(subjects, eq(classes.subjectId, subjects.id))
        .leftJoin(user, eq(classes.teacherId, user.id))
        .leftJoin(departments, eq(subjects.departmentId, departments.id))
        .where(eq(classes.id, classId))

    if(!classDetails) return res.status(404).json({ error: 'No Class found.' });

    res.status(200).json({ data: classDetails });
})

router.post("/", async (req, res) => {
    try {
        const [createdClass] = await db
            .insert(classes)
            .values({...req.body, inviteCode: Math.random().toString(36).substr(2, 9), schedule: []})
            .returning({id: classes.id});

        if(!createdClass) throw Error;

        res.status(201).json({ data: createdClass });

    }catch (err) {
        console.error("POST /classes error", err);
        res.status(500).json({error: err});
    }
})

export default router;