/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.e.a.b;

public class e {
    public static void a(boolean bl, String string, Object ... objectArray) {
        if (!bl) {
            throw new IllegalArgumentException(String.format(string, objectArray));
        }
    }
}

