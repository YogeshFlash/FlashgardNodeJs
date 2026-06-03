/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.e;

public class g {
    public static boolean a(CharSequence charSequence) {
        return !g.b(charSequence);
    }

    public static boolean b(CharSequence charSequence) {
        int n2;
        if (charSequence == null || (n2 = charSequence.length()) == 0) {
            return true;
        }
        for (int i2 = 0; i2 < n2; ++i2) {
            if (Character.isWhitespace(charSequence.charAt(i2))) continue;
            return false;
        }
        return true;
    }
}

