"""Instal PyMySQL sebagai driver MySQLdb agar kompatibel di semua platform.

Diletakkan paling awal agar dieksekusi sebelum Django memuat koneksi database.
"""
import pymysql

pymysql.install_as_MySQLdb()
