import os

ar_sys = """أنت مهندس حبكات روائية ومعماري سردي بارع، تمتلك معرفة عميقة بهندسة الفصول وقوانين التصاعد الدرامي ونقاط التحول المحورية. تبني مخططات فصول محكمة، دقيقة، بحيث يتمكن الكاتب من صياغة كل فصل فوراً دون تردد. لكل فصل هدف سردي واضح، ونبضات محددة، وقوس عاطفي متصاعد، وخاتمة مشوقة. تكتب بلغة عربية فصحى أدبية رفيعة."""

en_sys = """You are a novel architect with deep knowledge of Save the Cat beats, Sanderson's plotting principles, Dan Harmon's Story Circle, and MICE Quotient. You build outlines that an author can draft from without inventing structure on the fly. Every chapter has beats, emotional arc, and try-fail cycle type. You never use AI slop words. You write in clean, direct prose."""

ar_prompt_novel = """ابنِ مخططاً تفصيلياً كاملاً لفصول الرواية (OUTLINE.MD) باللغة العربية الفصحى.
المستهدف: رواية ملحمية من 20 إلى 24 فصلاً.

فكرة الرواية (البذرة):
{seed}

دليل العالم (WORLD BIBLE):
{world}

سجل الشخصيات (CHARACTERS):
{characters}

اللغز والسر الجوهري:
{mystery}

متطلبات المخطط:
قسّم الرواية إلى 4 فصول رئيسية (الأعمال الدرامية):
- الفصل التمهيدي (الفصول 1-6): التعريف بالعالم، الصعود، وتوزيع الأدوار وبداية التوتر.
- الفصل التصاعدي الأول (الفصول 7-12): أول بوادر الاستقلال والشرخ، نقطة اللاعودة في المنتصف.
- الفصل التصاعدي الثاني (الفصول 13-18): تصاعد الصراع، خلع الأقنعة، والانهيار الممنهج.
- الفصل الختامي (الفصول 19-24): الذروة الدرامية الكبرى، المواجهة الحاسمة، وحسم المصائر.

لكل فصل من الفصول (من الفصل 1 إلى الفصل 24)، اكتب التالي بدقة متناهية:
### الفصل X: [عنوان الفصل]
- شخصية وجهة النظر (POV): [اسم الشخصية]
- موقع المشهد: [المكان بالتحديد]
- النبضات السردية (Numbered Beats):
  1. [النبضة الأولى: كيف يبدأ المشهد]
  2. [النبضة الثانية: تصاعد الحوار أو الحدث]
  3. [النبضة الثالثة: المفاجأة أو التوتر]
  4. [النبضة الرابعة: القرار أو النتيجة]
- القوس العاطفي والهدف: [التحول الشعوري للشخصية]
- الخاتمة والخطاف: [كيف ينتهي الفصل ويمهّد للتالي]

اكتب المخطط كاملاً الآن باللغة العربية الفصحى لجميع الفصول الـ 24:
"""

ar_prompt_novella = """ابنِ مخططاً تفصيلياً كاملاً لفصول الرواية القصيرة "نوفيلا" (OUTLINE.MD) باللغة العربية الفصحى.
المستهدف: رواية قصيرة مكثفة (Novella) من 8 إلى 12 فصلاً كحد أقصى.

فكرة الرواية القصيرة (البذرة):
{seed}

دليل العالم (WORLD BIBLE):
{world}

سجل الشخصيات (CHARACTERS):
{characters}

اللغز والسر الجوهري:
{mystery}

متطلبات المخطط المكثف:
قسّم النوفيلا إلى 3 أجزاء رئيسية سريعة الإيقاع:
- البداية (الفصول 1-3): الحدث المحرض الفوري والدخول المباشر في الصراع.
- المنتصف (الفصول 4-8): تصاعد الأحداث، الكشف عن السر الجوهري، والاقتراب من نقطة الانهيار.
- النهاية (الفصول 9-12): المواجهة الحتمية السريعة والذروة العاطفية، وحسم المصير دون مماطلة.

لكل فصل من الفصول (من الفصل 1 حتى 12)، اكتب التالي بدقة متناهية:
### الفصل X: [عنوان الفصل]
- شخصية وجهة النظر (POV): [اسم الشخصية]
- موقع المشهد: [المكان بالتحديد]
- النبضات السردية (Numbered Beats):
  1. [النبضة الأولى]
  2. [النبضة الثانية]
  3. [النبضة الثالثة]
- القوس العاطفي والهدف: [التحول الشعوري للشخصية]
- الخاتمة والخطاف: [كيف ينتهي الفصل ويمهّد للتالي]

اكتب المخطط المكثف كاملاً الآن باللغة العربية الفصحى لجميع الفصول:
"""

en_prompt_novel = """Build a complete chapter outline for this epic novel. Target: 20-24 chapters.

SEED CONCEPT:
{seed}

THE CENTRAL MYSTERY:
{mystery}

WORLD BIBLE:
{world}

CHARACTER REGISTRY:
{characters}

VOICE:
{voice}

Build the complete chapter outline now. Each chapter must have specific beats, POV, setting, and emotional shift.
"""

en_prompt_novella = """Build a complete chapter outline for this compressed Novella. Target: 8-12 chapters maximum.

SEED CONCEPT:
{seed}

THE CENTRAL MYSTERY:
{mystery}

WORLD BIBLE:
{world}

CHARACTER REGISTRY:
{characters}

VOICE:
{voice}

Structure it as a fast-paced 3-act structure.
Act 1 (Ch 1-3): Inciting incident and immediate entry into the conflict.
Act 2 (Ch 4-8): Rising action, revealing the core mystery, midpoint reversal.
Act 3 (Ch 9-12): The climax and immediate resolution.

Build the complete chapter outline now. Each chapter must have specific beats, POV, setting, and emotional shift.
"""

with open("prompts/ar/outline_system.txt", "w") as f: f.write(ar_sys)
with open("prompts/en/outline_system.txt", "w") as f: f.write(en_sys)
with open("prompts/ar/outline_prompt.txt", "w") as f: f.write(ar_prompt_novel)
with open("prompts/en/outline_prompt.txt", "w") as f: f.write(en_prompt_novel)
with open("prompts/ar/outline_prompt_novella.txt", "w") as f: f.write(ar_prompt_novella)
with open("prompts/en/outline_prompt_novella.txt", "w") as f: f.write(en_prompt_novella)

with open("gen_outline.py", "r") as f:
    content = f.read()

new_gen = """
    lang = detect_project_language()
    novel_type = os.environ.get("AUTONOVEL_NOVEL_TYPE", "novel")
    
    prompt_file = "outline_prompt_novella.txt" if novel_type == "novella" else "outline_prompt.txt"
    sys_file = "outline_system.txt"
    
    sys_path = Path(__file__).resolve().parent / "prompts" / lang / sys_file
    prompt_path = Path(__file__).resolve().parent / "prompts" / lang / prompt_file
    
    if not sys_path.exists() or not prompt_path.exists():
        print(f"ERROR: Prompt files missing for {lang} ({novel_type})", file=sys.stderr)
        sys.exit(1)
        
    system_prompt = sys_path.read_text(encoding="utf-8")
    prompt_template = prompt_path.read_text(encoding="utf-8")
    
    prompt = prompt_template.format(
        seed=seed,
        world=world,
        characters=characters,
        mystery=mystery,
        voice=voice
    )
"""

import re
content = re.sub(r'    lang = detect_project_language\(\).*?    print\(f"Generating outline\.md \(Language:', new_gen + '\n    print(f"Generating outline.md (Language:', content, flags=re.DOTALL)

with open("gen_outline.py", "w") as f:
    f.write(content)

print("Generated prompt files and patched gen_outline.py")
