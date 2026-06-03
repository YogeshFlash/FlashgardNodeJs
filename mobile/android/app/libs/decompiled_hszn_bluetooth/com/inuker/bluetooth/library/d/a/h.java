/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.d.a;

import com.inuker.bluetooth.library.b;
import com.inuker.bluetooth.library.d.a.g;

public abstract class h
extends g {
    protected abstract void a(int var1, int var2);

    @Override
    public void onInvoke(Object ... objectArray) {
        int n2 = (Integer)objectArray[0];
        int n3 = (Integer)objectArray[1];
        if (n3 == 10 || n3 == 13) {
            b.a(null).a();
        }
        this.a(n2, n3);
    }

    @Override
    public String a() {
        return h.class.getSimpleName();
    }
}

