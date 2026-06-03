/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.connect.b;

import com.inuker.bluetooth.library.connect.b.i;
import com.inuker.bluetooth.library.connect.c.b;

public class h
extends i {
    public h(b b2) {
        super(b2);
    }

    @Override
    public void i() {
        this.f();
        this.m.postDelayed(new Runnable(){

            @Override
            public void run() {
                h.this.c(0);
            }
        }, 3000L);
    }
}

