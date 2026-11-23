#!/usr/bin/env python3
"""Rebuild the catalogue photographs from the original product JPEGs, replacing grey studio backgrounds with white without changing product geometry."""
from pathlib import Path
import base64
import io
import re
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parent.parent
NAMES=[
"ring-1-Cz3ws0ux","ring-2-B16VW5nY","ring-3-Qiw7MHPM","ring-4-DdmGjkv3",
"ring-5-DHVd5Ous","ring-6-BaUxRwUJ","ring-7-BcHnBBxQ","ring-8-C18XpEOy"
]

def white_background(source):
    src=np.asarray(Image.open(source).convert("RGB"),dtype=np.float32)
    h,w=src.shape[:2]
    yy,xx=np.indices((h,w))
    x=xx/w*2-1
    y=yy/h*2-1
    border=(np.abs(x)>.75)|(np.abs(y)>.73)
    sample=np.where(border & (yy%5==0) & (xx%5==0))
    basis=np.stack([np.ones_like(x),x,y,x*x,y*y,x*y,x*x*x,y*y*y],axis=-1)
    fit=np.linalg.lstsq(basis[sample],src[sample],rcond=None)[0]
    background=np.einsum("ijk,kl->ijl",basis,fit)
    darker=np.maximum(0,background.mean(axis=2)-src.mean(axis=2))
    alpha=np.clip((darker-7)/30,0,1)
    rgb=np.uint8(np.clip(src*alpha[...,None]+255*(1-alpha[...,None]),0,255))
    return Image.fromarray(rgb)

def main():
    for name in NAMES:
        picture=white_background(ROOT/(name+".jpg"))
        b=io.BytesIO()
        picture.save(b,format="PNG",optimize=True)
        encoded=base64.b64encode(b.getvalue()).decode("ascii")
        svg=('<?xml version="1.0" encoding="utf-8"?>'
             '<svg xmlns="http://www.w3.org/2000/svg" width="4096" height="4096" viewBox="0 0 4096 4096">'
             '<rect width="4096" height="4096" fill="#fff"/>'
             '<image x="0" y="0" width="4096" height="4096" preserveAspectRatio="xMidYMid meet"'
             ' href="data:image/png;base64,'+encoded+'"/></svg>')
        (ROOT/(name+"-white-v2.svg")).write_text(svg,encoding="utf-8")
    for filename in ["index.html","index-BAtkO90p.js"]:
        p=ROOT/filename
        content=p.read_text(encoding="utf-8")
        for name in NAMES:
            content=content.replace(name+"-4k.svg",name+"-white-v2.svg")
        p.write_text(content,encoding="utf-8")
    css=ROOT/"styles-Dv-WzuTc.css"
    text=css.read_text(encoding="utf-8")
    # Previous brightness filters do not affect the new v2 asset filenames.
    css.write_text(text,encoding="utf-8")
    print("Created 8 white-background catalogue images and updated HTML and JS")

if __name__=="__main__":
    main()
