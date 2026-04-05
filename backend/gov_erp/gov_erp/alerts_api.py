"""Auto-extracted domain module. All public functions are re-exported by api.py."""
from gov_erp.api_utils import *  # noqa: F401,F403 — shared utilities

# ============================================================================
# ALERTS API
# ============================================================================

@frappe.whitelist()
def get_alerts(unread_only=False, project=None, limit=50):
        """Get alerts for the current user."""
        _require_authenticated_user()
        from gov_erp.gov_erp.doctype.ge_alert.ge_alert import get_user_alerts

        alerts = get_user_alerts(
                unread_only=cint(unread_only),
                project=project,
                limit=cint(limit) or 50,
        )
        return {"success": True, "data": alerts}


@frappe.whitelist()
def get_unread_alert_count():
        """Get unread alert count for the current user."""
        _require_authenticated_user()
        from gov_erp.gov_erp.doctype.ge_alert.ge_alert import get_unread_count

        count = get_unread_count()
        return {"success": True, "data": {"count": count}}


@frappe.whitelist(methods=["POST"])
def mark_alert_as_read(alert_name=None):
        """Mark a single alert as read."""
        _require_authenticated_user()
        _require_param(alert_name, "alert_name")
        from gov_erp.gov_erp.doctype.ge_alert.ge_alert import mark_alert_read

        mark_alert_read(alert_name)
        frappe.db.commit()
        return {"success": True, "message": "Alert marked as read"}


@frappe.whitelist(methods=["POST"])
def mark_all_alerts_read():
        """Mark all alerts as read for the current user."""
        _require_authenticated_user()
        from gov_erp.gov_erp.doctype.ge_alert.ge_alert import mark_all_read

        mark_all_read()
        frappe.db.commit()
        return {"success": True, "message": "All alerts marked as read"}


# ============================================================================
# REMINDERS API
# ============================================================================

@frappe.whitelist(methods=["POST"])
def create_user_reminder(
        title=None,
        reminder_datetime=None,
        repeat_rule=None,
        linked_project=None,
        linked_site=None,
        linked_stage=None,
        linked_department=None,
        reference_doctype=None,
        reference_name=None,
        notes=None,
        shared_with=None,
):
        """Create a new reminder for the current user."""
        _require_authenticated_user()
        _require_param(title, "title")
        _require_param(reminder_datetime, "reminder_datetime")

        from gov_erp.gov_erp.doctype.ge_user_reminder.ge_user_reminder import create_reminder

        name = create_reminder(
                title=title,
                reminder_datetime=reminder_datetime,
                repeat_rule=repeat_rule,
                linked_project=linked_project,
                linked_site=linked_site,
                linked_stage=linked_stage,
                linked_department=linked_department,
                reference_doctype=reference_doctype,
                reference_name=reference_name,
                notes=notes,
                shared_with=shared_with,
        )
        frappe.db.commit()
        return {"success": True, "data": {"name": name}, "message": "Reminder created"}


@frappe.whitelist()
def get_reminders(project=None, active_only=1, limit=50):
        """Get reminders for the current user."""
        _require_authenticated_user()
        from gov_erp.gov_erp.doctype.ge_user_reminder.ge_user_reminder import get_user_reminders

        reminders = get_user_reminders(
                project=project,
                active_only=cint(active_only),
                limit=cint(limit) or 50,
        )
        return {"success": True, "data": reminders}


@frappe.whitelist(methods=["POST"])
def update_reminder(
        reminder_name=None,
        title=None,
        reminder_datetime=None,
        repeat_rule=None,
        linked_project=None,
        linked_site=None,
        linked_stage=None,
        linked_department=None,
        reference_doctype=None,
        reference_name=None,
        notes=None,
):
        """Update an existing reminder."""
        _require_authenticated_user()
        _require_param(reminder_name, "reminder_name")

        doc = frappe.get_doc("GE User Reminder", reminder_name)
        if doc.user != frappe.session.user and "System Manager" not in frappe.get_roles():
                frappe.throw("You can only modify your own reminders", frappe.PermissionError)

        if title is not None:
                doc.title = title
        if reminder_datetime is not None:
                doc.reminder_datetime = reminder_datetime
        if repeat_rule is not None:
                doc.repeat_rule = repeat_rule
        if linked_project is not None:
                doc.linked_project = linked_project
        if linked_site is not None:
                doc.linked_site = linked_site
        if linked_stage is not None:
                doc.linked_stage = linked_stage
        if linked_department is not None:
                doc.linked_department = linked_department
        if reference_doctype is not None:
                doc.reference_doctype = reference_doctype
        if reference_name is not None:
                doc.reference_name = reference_name
        if notes is not None:
                doc.notes = notes

        doc.save()
        frappe.db.commit()
        return {"success": True, "data": {"name": doc.name}, "message": "Reminder updated"}


@frappe.whitelist(methods=["POST"])
def snooze_reminder(reminder_name=None, minutes=15):
        """Snooze a reminder by N minutes."""
        _require_authenticated_user()
        _require_param(reminder_name, "reminder_name")

        doc = frappe.get_doc("GE User Reminder", reminder_name)
        if doc.user != frappe.session.user and "System Manager" not in frappe.get_roles():
                frappe.throw("You can only modify your own reminders", frappe.PermissionError)

        doc.snooze(cint(minutes) or 15)
        frappe.db.commit()
        return {"success": True, "message": f"Reminder snoozed for {minutes} minutes"}


@frappe.whitelist(methods=["POST"])
def dismiss_reminder(reminder_name=None):
        """Dismiss a reminder."""
        _require_authenticated_user()
        _require_param(reminder_name, "reminder_name")

        doc = frappe.get_doc("GE User Reminder", reminder_name)
        if doc.user != frappe.session.user and "System Manager" not in frappe.get_roles():
                frappe.throw("You can only modify your own reminders", frappe.PermissionError)

        doc.dismiss()
        frappe.db.commit()
        return {"success": True, "message": "Reminder dismissed"}


@frappe.whitelist(methods=["POST"])
def delete_reminder(reminder_name=None):
        """Delete a reminder."""
        _require_authenticated_user()
        _require_param(reminder_name, "reminder_name")

        doc = frappe.get_doc("GE User Reminder", reminder_name)
        if doc.user != frappe.session.user and "System Manager" not in frappe.get_roles():
                frappe.throw("You can only delete your own reminders", frappe.PermissionError)

        doc.delete()
        frappe.db.commit()
        return {"success": True, "message": "Reminder deleted"}


@frappe.whitelist()
def count_missed_reminders():
        """Return count of past-due active/snoozed reminders for the current user.

        A reminder is "missed" when next_reminder_at is in the past,
        status is Active or Snoozed, and is_sent = 0.
        Also counts reminders shared with the current user that are past-due.
        """
        _require_authenticated_user()
        from frappe.utils import now_datetime

        user = frappe.session.user
        now = now_datetime()

        own_count = frappe.db.count(
                "GE User Reminder",
                filters={
                        "user": user,
                        "status": ["in", ["Active", "Snoozed"]],
                        "is_sent": 0,
                        "next_reminder_at": ["<=", now],
                },
        )
        shared_count = frappe.db.count(
                "GE User Reminder",
                filters={
                        "shared_with": user,
                        "status": ["in", ["Active", "Snoozed"]],
                        "is_sent": 0,
                        "next_reminder_at": ["<=", now],
                },
        )
        total = (own_count or 0) + (shared_count or 0)
        return {"success": True, "data": {"count": total}}




@frappe.whitelist(methods=["POST"])
def add_record_comment(
        reference_doctype=None,
        reference_name=None,
        content=None,
        comment_type="Comment",
):
        """Add a comment to a record (project, site, milestone, etc.)."""
        _require_authenticated_user()
        _require_param(reference_doctype, "reference_doctype")
        _require_param(reference_name, "reference_name")
        _require_param(content, "content")

        # Verify the user can see the referenced document
        if not frappe.has_permission(reference_doctype, "read", reference_name):
                frappe.throw("You do not have permission to comment on this record", frappe.PermissionError)

        comment = frappe.get_doc({
                "doctype": "Comment",
                "comment_type": comment_type,
                "reference_doctype": reference_doctype,
                "reference_name": reference_name,
                "content": content,
                "comment_email": frappe.session.user,
        })
        comment.insert(ignore_permissions=True)
        frappe.db.commit()

        # Handle @mentions in the comment content
        _process_mentions(content, reference_doctype, reference_name)

        # Push realtime update
        frappe.publish_realtime(
                event="ge_new_comment",
                message={
                        "reference_doctype": reference_doctype,
                        "reference_name": reference_name,
                        "comment_name": comment.name,
                        "comment_by": frappe.session.user,
                },
                doctype=reference_doctype,
                docname=reference_name,
        )

        return {
                "success": True,
                "data": {
                        "name": comment.name,
                        "content": comment.content,
                        "comment_by": comment.comment_email,
                        "creation": str(comment.creation),
                },
        }


@frappe.whitelist()
def get_record_comments(reference_doctype=None, reference_name=None, limit=50):
        """Get comments for a record."""
        _require_authenticated_user()
        _require_param(reference_doctype, "reference_doctype")
        _require_param(reference_name, "reference_name")

        if not frappe.has_permission(reference_doctype, "read", reference_name):
                frappe.throw("You do not have permission to view this record", frappe.PermissionError)

        comments = frappe.get_all(
                "Comment",
                filters={
                        "reference_doctype": reference_doctype,
                        "reference_name": reference_name,
                        "comment_type": "Comment",
                },
                fields=[
                        "name",
                        "content",
                        "comment_email",
                        "comment_by",
                        "creation",
                        "modified",
                ],
                order_by="creation asc",
                limit_page_length=cint(limit) or 50,
        )

        # Enrich with user full names
        for c in comments:
                c["full_name"] = frappe.db.get_value(
                        "User", c.comment_email, "full_name"
                ) or c.comment_email

        return {"success": True, "data": comments}


@frappe.whitelist(methods=["POST"])
def assign_to_record(
        reference_doctype=None,
        reference_name=None,
        assign_to_user=None,
        description=None,
        priority="Medium",
        date=None,
):
        """Assign a user to a record (creates a ToDo)."""
        _require_authenticated_user()
        _require_param(reference_doctype, "reference_doctype")
        _require_param(reference_name, "reference_name")
        _require_param(assign_to_user, "assign_to_user")

        if not frappe.has_permission(reference_doctype, "read", reference_name):
                frappe.throw("You do not have permission to assign on this record", frappe.PermissionError)

        from frappe.desk.form.assign_to import add as assign_add

        result = assign_add({
                "doctype": reference_doctype,
                "name": reference_name,
                "assign_to": [assign_to_user],
                "description": description or f"Assigned by {frappe.session.user}",
                "priority": priority,
                "date": date,
        })

        frappe.db.commit()

        # Emit alert for the assignee
        from gov_erp.alert_dispatcher import emit_alert

        # Try to get project context from the record
        project = None
        if reference_doctype == "Project":
                project = reference_name
        else:
                project = frappe.db.get_value(
                        reference_doctype, reference_name, "linked_project"
                ) if frappe.get_meta(reference_doctype).has_field("linked_project") else None

        emit_alert(
                "approval_assigned",
                f"You have been assigned to {reference_doctype} {reference_name}",
                project=project,
                reference_doctype=reference_doctype,
                reference_name=reference_name,
                extra_recipients=[assign_to_user],
        )

        return {"success": True, "message": f"Assigned to {assign_to_user}"}


@frappe.whitelist()
def get_record_assignments(reference_doctype=None, reference_name=None):
        """Get current assignments (ToDos) for a record."""
        _require_authenticated_user()
        _require_param(reference_doctype, "reference_doctype")
        _require_param(reference_name, "reference_name")

        if not frappe.has_permission(reference_doctype, "read", reference_name):
                frappe.throw("You do not have permission to view this record", frappe.PermissionError)

        todos = frappe.get_all(
                "ToDo",
                filters={
                        "reference_type": reference_doctype,
                        "reference_name": reference_name,
                        "status": ["!=", "Cancelled"],
                },
                fields=[
                        "name",
                        "allocated_to",
                        "description",
                        "priority",
                        "date",
                        "status",
                        "creation",
                ],
                order_by="creation desc",
        )

        for t in todos:
                t["full_name"] = frappe.db.get_value(
                        "User", t.allocated_to, "full_name"
                ) or t.allocated_to

        return {"success": True, "data": todos}


def _process_mentions(content: str, reference_doctype: str, reference_name: str):
        """Parse @mentions from comment content and send alerts."""
        import re

        # Match @user@example.com or @FirstName LastName patterns
        mention_pattern = re.compile(r'@([\w.+-]+@[\w.-]+\.\w+)')
        mentions = mention_pattern.findall(content)

        if not mentions:
                return

        from gov_erp.alert_dispatcher import on_mention

        # Try to determine the project context
        project = None
        if reference_doctype == "Project":
                project = reference_name
        else:
                meta = frappe.get_meta(reference_doctype)
                if meta.has_field("linked_project"):
                        project = frappe.db.get_value(reference_doctype, reference_name, "linked_project")

        actor_name = frappe.db.get_value("User", frappe.session.user, "full_name") or frappe.session.user

        for email in mentions:
                if frappe.db.exists("User", email):
                        on_mention(
                                mentioned_user=email,
                                summary=f"{actor_name} mentioned you in {reference_doctype} {reference_name}",
                                project=project,
                                reference_doctype=reference_doctype,
                                reference_name=reference_name,
                        )


