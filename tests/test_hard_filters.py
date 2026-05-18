"""
Tests de scripts/hard_filters.py — los 6 filtros del spec sec 3.2.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from hard_filters import (
    has_code,
    count_steps,
    count_images,
    word_count,
    has_materials_list,
    matches_excluded_keyword,
    apply_all,
)


def test_has_code_detects_python():
    body = "```python\nimport time\nprint('hello')\n```"
    assert has_code(body)


def test_has_code_detects_arduino():
    body = "```cpp\nvoid setup() { Serial.begin(9600); }\n```"
    assert has_code(body)


def test_has_code_detects_inline_code():
    body = "Use the <code>analogRead</code> function to read the pin."
    assert has_code(body)


def test_has_code_rejects_prose_only():
    body = "This is just prose. No code blocks, no inline code, just text."
    assert not has_code(body)


def test_count_steps_numeric_list():
    body = "1. First step\n2. Second step\n3. Third step\n4. Fourth\n5. Fifth"
    assert count_steps(body) >= 5


def test_count_steps_markdown_headers():
    body = "## Step 1\nfoo\n## Step 2\nbar\n## Step 3\nbaz\n## Step 4\nqux\n## Step 5\nfinal"
    assert count_steps(body) >= 5


def test_count_steps_low_count():
    body = "Just one paragraph. No structure."
    assert count_steps(body) < 5


def test_count_images_markdown():
    body = "![alt1](url1)\n![alt2](url2)\n![alt3](url3)"
    assert count_images(body) == 3


def test_count_images_html():
    body = '<img src="a.jpg"><img src="b.png"><img src="c.gif">'
    assert count_images(body) == 3


def test_count_images_zero():
    assert count_images("just text") == 0


def test_word_count_basic():
    assert word_count("one two three four five") == 5


def test_word_count_strips_markdown():
    body = "real content here\n```\ncode here\nmore code\n```\nmore real"
    n = word_count(body)
    assert n <= 7


def test_has_materials_list_explicit():
    body = "Materials:\n- Arduino UNO\n- Resistor 220Ω\n- Breadboard"
    assert has_materials_list(body)


def test_has_materials_list_spanish():
    body = "Necesitás:\n- Arduino UNO\n- Sensor DHT22"
    assert has_materials_list(body)


def test_has_materials_list_components_keyword():
    body = "## Components\n- ESP32\n- DHT22\n- 10kΩ resistor"
    assert has_materials_list(body)


def test_has_materials_list_missing():
    body = "Just a long paragraph without any list of stuff to buy or use."
    assert not has_materials_list(body)


def test_excluded_keyword_match():
    body = "How to install Windows 11 on your PC"
    excluded = ["windows 11", "windows 12"]
    assert matches_excluded_keyword(body, excluded)


def test_excluded_keyword_no_match():
    body = "How to wire up an ESP32 with a DHT22 sensor"
    excluded = ["windows 11"]
    assert not matches_excluded_keyword(body, excluded)


def test_excluded_keyword_case_insensitive():
    body = "INSTALL UBUNTU on Raspberry Pi"
    excluded = ["ubuntu"]
    assert matches_excluded_keyword(body, excluded)


def test_apply_all_pass():
    body = """## Step 1: Setup
```python
import time
```
![diagram](url)
Materials:
- Arduino UNO

## Step 2: Wire it
![photo](url2)

## Step 3: Code
```cpp
void loop() { delay(1000); }
```
![scope](url3)

## Step 4: Test

## Step 5: Improve

Lots of useful prose explaining each step in detail with multiple sentences
so we have at least 800 useful words. """ + ("Foo bar baz qux. " * 200)

    result = apply_all(body, excluded_keywords=[])
    assert result["passed"], f"Should pass but: {result['reasons']}"


def test_apply_all_fails_no_code_with_few_steps():
    """Pablo 17-may-2026: la regla `no_code` ya no bloquea por sí sola.
    Ahora rechaza solo si TAMBIÉN hay <5 steps (tutorial corto sin código =
    probable artículo de noticia disfrazado). Tutoriales largos sin
    código (e.g. soldadura, calibración) SÍ pasan."""
    body = "Materials:\n- Arduino UNO\n\n## Step 1\n## Step 2\n## Step 3\n" + ("word " * 1000)
    result = apply_all(body, excluded_keywords=[])
    assert not result["passed"]
    # Antes era "no_code"; ahora es la regla combinada con threshold
    assert any("no_code_and_steps_below" in r for r in result["reasons"])


def test_apply_all_allows_no_code_with_many_steps():
    """Tutorial largo (5+ steps) sin código pasa: e.g. soldadura, mecánica."""
    body = (
        "Materials:\n- Soldador\n- Estaño\n\n"
        "## Step 1\n## Step 2\n## Step 3\n## Step 4\n## Step 5\n"
        "![img1](u)\n![img2](u)\n![img3](u)\n"
        + ("word " * 1000)
    )
    result = apply_all(body, excluded_keywords=[])
    assert result["passed"], f"Esperado pass, falló: {result['reasons']}"


def test_apply_all_fails_excluded_kw():
    body = "How to install Ubuntu on your PC\n```bash\nsudo apt install\n```\n## Step 1\n## Step 2\n## Step 3\n## Step 4\n## Step 5\nMaterials: PC\n![img](u)![img](u)![img](u)\n" + ("word " * 1000)
    result = apply_all(body, excluded_keywords=["ubuntu"])
    assert not result["passed"]
    assert any("excluded_keyword" in r for r in result["reasons"])
