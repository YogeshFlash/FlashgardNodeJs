/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.e;

import java.util.UUID;

public class i {
    public static final String a = "0000%04x-0000-1000-8000-00805f9b34fb";

    public static UUID a(int n2) {
        return UUID.fromString(String.format(a, n2));
    }

    public static int a(UUID uUID) {
        return (int)(uUID.getMostSignificantBits() >>> 32);
    }
}

