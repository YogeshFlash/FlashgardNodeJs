/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.d.a;

import com.inuker.bluetooth.library.d.a.g;

public abstract class c
extends g {
    protected abstract void a(String var1, int var2);

    @Override
    public void onInvoke(Object ... objectArray) {
        String string = (String)objectArray[0];
        int n2 = (Integer)objectArray[1];
        this.a(string, n2);
    }

    @Override
    public String a() {
        return c.class.getSimpleName();
    }
}

