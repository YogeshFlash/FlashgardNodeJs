/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.a;

import com.inuker.bluetooth.library.a.b;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.ArrayList;
import java.util.List;

public class c {
    private byte[] a;
    private ByteBuffer b;

    public c(b b2) {
        this(b2.c);
    }

    public c(byte[] byArray) {
        this.a = byArray;
        this.b = ByteBuffer.wrap(byArray).order(ByteOrder.LITTLE_ENDIAN);
    }

    public void a(int n2) {
        this.b.position(n2);
    }

    public int a() {
        return this.b.get() & 0xFF;
    }

    public int b() {
        return this.b.getShort() & 0xFFFF;
    }

    public boolean a(int n2, int n3) {
        return (n2 & 1 << n3) != 0;
    }

    public static List<b> a(byte[] byArray) {
        b b2;
        ArrayList<b> arrayList = new ArrayList<b>();
        for (int i2 = 0; i2 < byArray.length && (b2 = c.a(byArray, i2)) != null; i2 += b2.a + 1) {
            arrayList.add(b2);
        }
        return arrayList;
    }

    private static b a(byte[] byArray, int n2) {
        int n3;
        b b2 = null;
        if (byArray.length - n2 >= 2 && (n3 = byArray[n2]) > 0) {
            byte by = byArray[n2 + 1];
            int n4 = n2 + 2;
            if (n4 < byArray.length) {
                b2 = new b();
                int n5 = n4 + n3 - 2;
                if (n5 >= byArray.length) {
                    n5 = byArray.length - 1;
                }
                b2.b = by & 0xFF;
                b2.a = n3;
                b2.c = com.inuker.bluetooth.library.e.c.a(byArray, n4, n5);
            }
        }
        return b2;
    }
}

