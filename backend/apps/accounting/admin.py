from django.contrib import admin

from .models import ChartOfAccount, JournalEntry


@admin.register(ChartOfAccount)
class ChartOfAccountAdmin(admin.ModelAdmin):
    list_display = ("account_id", "code", "name", "account_type", "is_active")
    list_filter = ("account_type", "is_active")
    search_fields = ("code", "name")


@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = (
        "journal_entry_id",
        "date",
        "description",
        "account",
        "debit",
        "credit",
        "reference_type",
        "reference_id",
    )
    list_filter = ("reference_type", "date")
    search_fields = ("description", "account__name")
