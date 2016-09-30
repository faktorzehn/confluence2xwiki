#!/usr/bin/python
import sys, convert, json

def enc_print(string='', encoding='utf8'):
    sys.stdout.buffer.write(string.encode(encoding) + b'\n')

request = sys.stdin.buffer.read().decode("utf-8")
body = json.loads(request)["body"]

(result, log) = convert.convert(body)
response = {"result": result, "log": log}

enc_print("Content-type: application/json; charset=UTF-8")
enc_print()
enc_print(json.dumps(response))