/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.e;

import java.util.ArrayList;
import java.util.List;

public class d {
    public static boolean a(List<?> list) {
        return list == null || list.size() <= 0;
    }

    public static <E> List<E> a() {
        return new ArrayList();
    }
}

