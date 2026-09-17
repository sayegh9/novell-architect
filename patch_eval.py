import re

with open("prompts/ar/evaluate_chapter.txt", "r") as f:
    content = f.read()

new_slop_text = """10. slop_and_cliches: (فحص الرداءة الأسلوبية وكليشيهات الذكاء الاصطناعي الثمانية المحرمة):
    احسم الدرجة بشدة إذا ظهرت إحدى هذه الأنماط (تعتبر علامات رداءة حتمية):
    1. استخدام أفعال مثل "استفسر/أردف" بكثرة في الحوار.
    2. صياغات على وزن "لم يسعه إلا أن...".
    3. ختم الفقرات بـ "في نهاية المطاف".
    4. الإفراط في "تراقص الضوء والظلال".
    5. التنهيدات المصطنعة ("تنهد بعمق").
    6. التقرير عن "ثقل الهواء/توقف الزمن".
    7. نبض القلب كدليل على الخوف ("كان يسمع دقات قلبه").
    8. الابتسامات الفارغة ("ابتسم ابتسامة باهتة/حزينة")."""

content = re.sub(
    r'10\. slop_and_cliches:.*?فكر في نفسه قائلاً\.\.\.«\)\.',
    new_slop_text,
    content,
    flags=re.DOTALL
)

with open("prompts/ar/evaluate_chapter.txt", "w") as f:
    f.write(content)
print("Evaluate chapter patched.")
