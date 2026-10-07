from config.settings.utils import clean_hosts, clean_origins


def test_clean_hosts_fixes_the_common_mistakes():
    raw = ["https://www.wahednur.tech", " localhost", "127.0.0.1 ", "api.wahednur.tech/", ""]
    assert clean_hosts(raw) == ["www.wahednur.tech", "localhost", "127.0.0.1", "api.wahednur.tech"]


def test_clean_hosts_removes_duplicates_and_keeps_order():
    assert clean_hosts(["a.com", "https://a.com", "b.com"]) == ["a.com", "b.com"]


def test_clean_origins_trims_spaces_and_trailing_slashes():
    raw = ["https://www.wahednur.tech", " https://wahednur.tech/", "", "https://www.wahednur.tech"]
    assert clean_origins(raw) == ["https://www.wahednur.tech", "https://wahednur.tech"]
