import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const out = {};
for (const t of ["zcg_meetings", "zcg_elections", "zcg_links"]) {
  out[t] = await sql.unsafe(`select * from ${t} order by 1`);
}
await sql.end();
console.log(JSON.stringify(out, null, 1));
