/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.b.a;

import com.inuker.bluetooth.library.b.a.c;
import com.inuker.bluetooth.library.b.a.d;
import java.nio.ByteBuffer;

public abstract class e {
    static final int g = 20;
    static final byte[] h = new byte[20];
    static final int i = 0;
    public static final int j = 0;
    public static final int k = 1;
    public static final String l = "ack";
    public static final String m = "data";
    public static final String n = "ctr";

    private static b b(byte[] byArray) {
        b b2 = new b();
        ByteBuffer byteBuffer = ByteBuffer.wrap(byArray);
        b2.a = byteBuffer.getShort();
        b2.e = byArray;
        if (b2.a == 0) {
            b2.b = byteBuffer.get();
            b2.c = byteBuffer.get();
            b2.d = byteBuffer.getInt();
        }
        return b2;
    }

    public static e a(byte[] byArray) {
        b b2 = e.b(byArray);
        switch (b2.a) {
            case 0: {
                return e.a(b2);
            }
        }
        return e.b(b2);
    }

    private static e a(b b2) {
        int n2 = b2.d;
        switch (b2.b) {
            case 0: {
                int n3 = n2 >> 16;
                return new com.inuker.bluetooth.library.b.a.b(n3);
            }
            case 1: {
                int n4 = n2 >> 16;
                int n5 = n2 & 0xFFFF;
                return new com.inuker.bluetooth.library.b.a.a(n4, n5);
            }
        }
        return new d();
    }

    private static e b(b b2) {
        return new c(b2.a, new a(b2.e, 2));
    }

    public abstract String a();

    public abstract byte[] d();

    static class a {
        byte[] a;
        int b;
        int c;

        a(byte[] byArray, int n2) {
            this(byArray, n2, byArray.length);
        }

        a(byte[] byArray, int n2, int n3) {
            this.a = byArray;
            this.b = n2;
            this.c = n3;
        }

        int a() {
            return this.c - this.b;
        }
    }

    private static class b {
        int a;
        int b;
        int c;
        int d;
        byte[] e;

        private b() {
        }
    }
}

