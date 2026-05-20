from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor


OUTPUT_PATH = "QueueLess_Presentation.pptx"

TITLE_COLOR = RGBColor(15, 23, 42)  # slate-900
ACCENT_COLOR = RGBColor(29, 78, 216)  # blue-700
MUTED_COLOR = RGBColor(71, 85, 105)  # slate-600


def add_title_slide(prs, title, subtitle):
    slide = prs.slides.add_slide(prs.slide_layouts[0])
    title_shape = slide.shapes.title
    subtitle_shape = slide.placeholders[1]

    title_shape.text = title
    title_shape.text_frame.paragraphs[0].font.size = Pt(44)
    title_shape.text_frame.paragraphs[0].font.color.rgb = TITLE_COLOR

    subtitle_shape.text = subtitle
    subtitle_shape.text_frame.paragraphs[0].font.size = Pt(20)
    subtitle_shape.text_frame.paragraphs[0].font.color.rgb = MUTED_COLOR


def add_bullets_slide(prs, title, bullets):
    slide = prs.slides.add_slide(prs.slide_layouts[1])
    title_shape = slide.shapes.title
    body = slide.shapes.placeholders[1].text_frame

    title_shape.text = title
    title_shape.text_frame.paragraphs[0].font.size = Pt(32)
    title_shape.text_frame.paragraphs[0].font.color.rgb = TITLE_COLOR

    body.clear()
    for i, bullet in enumerate(bullets):
        p = body.paragraphs[0] if i == 0 else body.add_paragraph()
        p.text = bullet
        p.level = 0
        p.font.size = Pt(20)
        p.font.color.rgb = MUTED_COLOR


def add_two_column_slide(prs, title, left_title, left_bullets, right_title, right_bullets):
    slide = prs.slides.add_slide(prs.slide_layouts[5])
    title_shape = slide.shapes.title
    title_shape.text = title
    title_shape.text_frame.paragraphs[0].font.size = Pt(30)
    title_shape.text_frame.paragraphs[0].font.color.rgb = TITLE_COLOR

    left_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.9), Inches(4.3), Inches(4.7))
    right_box = slide.shapes.add_textbox(Inches(5.0), Inches(1.9), Inches(4.3), Inches(4.7))

    left_tf = left_box.text_frame
    left_tf.text = left_title
    left_tf.paragraphs[0].font.size = Pt(20)
    left_tf.paragraphs[0].font.bold = True
    left_tf.paragraphs[0].font.color.rgb = ACCENT_COLOR

    for bullet in left_bullets:
        p = left_tf.add_paragraph()
        p.text = bullet
        p.level = 1
        p.font.size = Pt(18)
        p.font.color.rgb = MUTED_COLOR

    right_tf = right_box.text_frame
    right_tf.text = right_title
    right_tf.paragraphs[0].font.size = Pt(20)
    right_tf.paragraphs[0].font.bold = True
    right_tf.paragraphs[0].font.color.rgb = ACCENT_COLOR

    for bullet in right_bullets:
        p = right_tf.add_paragraph()
        p.text = bullet
        p.level = 1
        p.font.size = Pt(18)
        p.font.color.rgb = MUTED_COLOR


def build_deck():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    add_title_slide(
        prs,
        "QueueLess",
        "Smart Hospital Queue Management System\nEvery token. Every hospital. One screen."
    )

    add_bullets_slide(
        prs,
        "Problem",
        [
            "No visibility before leaving home: patients guess which hospital is busy",
            "No real-time visibility after arrival: uncertainty, long waits, no alerts",
            "Queue apps miss walk-ins, so counts are inaccurate and untrusted",
        ],
    )

    add_bullets_slide(
        prs,
        "Root Cause",
        [
            "Physical tokens and digital bookings live in separate systems",
            "QueueLess unifies reception desk and app-issued tokens",
            "Accurate counts enable trustworthy live comparisons",
        ],
    )

    add_bullets_slide(
        prs,
        "Core USP",
        [
            "Real-time multi-hospital comparison before leaving home",
            "Every token (walk-in or app) flows through one system",
            "Turns queue tracking into a pre-visit decision tool",
        ],
    )

    add_bullets_slide(
        prs,
        "Survey Insights (Lahore, 33 respondents)",
        [
            "67% would use a queue app",
            "39% left a hospital due to long queues",
            "82% rarely or never receive notifications",
            "66% rate current system 1-2 out of 5",
        ],
    )

    add_bullets_slide(
        prs,
        "Solution Overview",
        [
            "Patients: compare hospitals, track live position",
            "Reception: issue walk-in tokens with printed receipts",
            "Doctors: tap Next to move the queue in real time",
        ],
    )

    add_bullets_slide(
        prs,
        "Token System Flow",
        [
            "Reception issues token in-app and prints receipt",
            "Token joins the live queue immediately",
            "Doctor taps Next to advance the queue",
            "All patients see updated wait times",
        ],
    )

    add_bullets_slide(
        prs,
        "Feature Set",
        [
            "Nearby + Specialty tabs with live wait estimates",
            "Real-time queue position and SMS/WhatsApp alerts",
            "Doctor Next button + admin queue dashboard",
        ],
    )

    add_two_column_slide(
        prs,
        "Why QueueLess Is Different",
        "Other Queue Apps",
        [
            "Count app users only",
            "Walk-ins invisible, inaccurate queues",
            "Single-hospital view",
            "Wait time after arrival",
        ],
        "QueueLess",
        [
            "Every token in one system",
            "Reception prints walk-in receipts",
            "Multi-hospital comparison",
            "Know where to go before leaving",
        ],
    )

    add_bullets_slide(
        prs,
        "Research Plan + Timeline",
        [
            "Interviews with patients and receptionists",
            "Usability tests on comparison + token flow",
            "12-week plan: research, wireframes, prototype, testing",
            "Team: UX research, UI/UX design, proposal + presentation",
        ],
    )

    prs.save(OUTPUT_PATH)


if __name__ == "__main__":
    build_deck()
