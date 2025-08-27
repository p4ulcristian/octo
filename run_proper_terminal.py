#!/usr/bin/env python3

import os
import sys

def main():
    venv_python = os.path.join('venv_cef', 'bin', 'python')
    if os.path.exists(venv_python):
        os.execv(venv_python, [venv_python, 'proper_terminal.py'])
    else:
        print("CEF virtual environment not found. Please run:")
        print("python3.12 -m venv venv_cef")
        print("source venv_cef/bin/activate")
        print("pip install -r requirements_cef.txt")
        sys.exit(1)

if __name__ == '__main__':
    main()