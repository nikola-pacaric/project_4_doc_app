import json
import re
from pathlib import Path

p = Path(
    r"C:\Users\nikol\.grok\sessions\C%3A%5CUsers%5Cnikol%5COneDrive%5CDesktop%5Cproject_4_doc_app\019f5214-b97f-75a3-95d7-5595278a2789\mcp\call-e021646e-edcf-4c60-86e0-bdcf42580beb-6.json"
)
text = p.read_text(encoding="utf-8")
# screens array objects often have name then title
for m in re.finditer(
    r'"name"\s*:\s*"(projects/[^"]+/screens/[^"]+)".{0,400}?"title"\s*:\s*"((?:\\.|[^"\\])*)"',
    text,
    flags=re.S,
):
    name, title = m.group(1), m.group(2)
    if any(
        k in title.lower()
        for k in ["auth", "sign", "login", "register", "choice", "tactile entry"]
    ):
        print(f"{title}\n  {name}\n")
