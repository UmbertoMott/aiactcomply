import psycopg2
conn = psycopg2.connect('postgresql://postgres:Aicomply2024!.@db.vcemjcxxgytcwkxevqhj.supabase.co:5432/postgres')
cur = conn.cursor()
cur.execute('SELECT document_id, COUNT(*) FROM rag_chunks GROUP BY document_id ORDER BY document_id')
total = 0
for row in cur.fetchall():
    print(f'  {row[0]:40} {row[1]} chunks')
    total += row[1]
print(f'\n  TOTALE: {total} chunks')
conn.close()
