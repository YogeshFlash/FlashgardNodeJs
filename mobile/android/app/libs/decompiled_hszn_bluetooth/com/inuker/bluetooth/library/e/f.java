/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.e;

import java.util.Random;

public class f {
    private static Random a;

    public static double a() {
        if (a == null) {
            a = new Random();
            a.setSeed(System.currentTimeMillis());
        }
        return a.nextDouble();
    }
}

