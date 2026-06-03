/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.d.a;

import com.inuker.bluetooth.library.d.a.g;
import java.util.UUID;

public abstract class b
extends g {
    protected abstract void a(String var1, UUID var2, UUID var3, byte[] var4);

    @Override
    public void onInvoke(Object ... objectArray) {
        String string = (String)objectArray[0];
        UUID uUID = (UUID)objectArray[1];
        UUID uUID2 = (UUID)objectArray[2];
        byte[] byArray = (byte[])objectArray[3];
        this.a(string, uUID, uUID2, byArray);
    }

    @Override
    public String a() {
        return b.class.getSimpleName();
    }
}

