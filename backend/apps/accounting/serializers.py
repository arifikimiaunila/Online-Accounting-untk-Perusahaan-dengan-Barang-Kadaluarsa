from rest_framework import serializers

from .models import ChartOfAccount, JournalEntry


class ChartOfAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChartOfAccount
        fields = ["account_id", "code", "name", "account_type", "is_active"]


class JournalEntrySerializer(serializers.ModelSerializer):
    account_code = serializers.CharField(source="account.code", read_only=True)
    account_name = serializers.CharField(source="account.name", read_only=True)
    account = serializers.PrimaryKeyRelatedField(
        queryset=ChartOfAccount.objects.all()
    )

    class Meta:
        model = JournalEntry
        fields = [
            "journal_entry_id",
            "date",
            "description",
            "account",
            "account_code",
            "account_name",
            "debit",
            "credit",
            "reference_type",
            "reference_id",
            "created_at",
        ]
