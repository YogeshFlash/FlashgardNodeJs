/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.connect.listener;

import com.inuker.bluetooth.library.d.a.f;

public abstract class a
extends f {
    public abstract void a(String var1, int var2);

    @Override
    public void onSyncInvoke(Object ... objectArray) {
        String string = (String)objectArray[0];
        int n2 = (Integer)objectArray[1];
        this.a(string, n2);
    }
}

