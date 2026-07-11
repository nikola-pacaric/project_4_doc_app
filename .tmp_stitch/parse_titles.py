import json
import re
from pathlib import Path

p = Path(
    r"C:\Users\nikol\.grok\sessions\C%3A%5CUsers%5Cnikol%5COneDrive%5CDesktop%5Cproject_4_doc_app\019f5214-b97f-75a3-95d7-5595278a2789\mcp\call-e021646e-edcf-4c60-86e0-bdcf42580beb-6.json"
)
raw = p.read_text(encoding="utf-8")
# Try parse as JSON first
try:
    data = json.loads(raw)
    text = json.dumps(data)
except Exception:
    text = raw

titles = re.findall(r'"title"\s*:\s*"((?:\\.|[^"\\])*)"', text)
unique = sorted(set(titles))
print("count", len(unique))
for t in unique:
    print(t)
